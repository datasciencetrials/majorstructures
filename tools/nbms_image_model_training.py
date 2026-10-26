import hashlib
import json
import math
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


DEPLOY = Path(r"D:\nbms_push_recovery_20260624")
DATA = DEPLOY / "data"
GALLERY = DEPLOY / "gallery"
MODEL_DIR = DEPLOY / "models" / "image_inspection"
TODAY = date.today().isoformat()
IMAGE_SIZE = (32, 32)
MAX_TRAIN_IMAGES = 3600
EPOCHS = 16
BATCH_SIZE = 128
RANDOM_SEED = 42
TRAINABLE_CONDITIONS = ["Critical", "Poor", "Marginal", "Satisfactory", "Good"]


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def as_id(value):
    if value is None:
        return None
    text = str(value).strip().upper()
    return text or None


def normalized_condition(value):
    text = str(value or "").strip().lower()
    if not text or text in {"nan", "none", "null", "-", "no data"}:
        return "No Data"
    if "critical" in text or "very poor" in text or "beyond" in text:
        return "Critical"
    if text == "poor" or " poor" in text:
        return "Poor"
    if "marginal" in text:
        return "Marginal"
    if "satisfactory" in text or "fair" in text:
        return "Satisfactory"
    if "good" in text:
        return "Good"
    if "replaced" in text or "retired" in text:
        return "Replaced"
    return str(value or "No Data").strip()


def structure_id(row, kind):
    if kind == "bridge":
        return as_id(row.get("BridgeNumber") or row.get("bridge_no") or row.get("new_bridge_no") or row.get("original_bridge_no"))
    return as_id(row.get("CulvertNumber") or row.get("Culvert No") or row.get("culvert_no"))


def structure_name(row, kind):
    if kind == "bridge":
        return row.get("BridgeName") or row.get("bridge_nam") or row.get("river") or "Bridge"
    return row.get("Road") or row.get("LinkName") or row.get("Link_Name") or row.get("River") or "Major Culvert"


def build_structure_labels():
    labels = {}
    for kind, path in [("bridge", DATA / "bridges.json"), ("culvert", DATA / "culverts.json")]:
        for row in read_json(path):
            sid = structure_id(row, kind)
            if not sid:
                continue
            condition = normalized_condition(row.get("OverallCondition") or row.get("LatestConditionFound"))
            confidence = row.get("condition_confidence") or row.get("ConditionConfidence")
            active = row.get("active_structure", True)
            labels[sid] = {
                "structure_id": sid,
                "structure_type": "Bridge" if kind == "bridge" else "Major Culvert",
                "structure_name": structure_name(row, kind),
                "condition_label": condition,
                "overall_rating": row.get("OverallConditionRating"),
                "condition_confidence": confidence,
                "active_structure": active,
                "condition_source_workbook": row.get("condition_source_workbook") or row.get("ConditionSourceWorkbook"),
                "condition_source_sheet": row.get("condition_source_sheet") or row.get("ConditionSourceSheet"),
                "condition_provenance": row.get("condition_provenance") or row.get("ConditionProvenance"),
                "components": {
                    "approaches": row.get("approaches_rating") or row.get("Approaches"),
                    "roadway": row.get("roadway_rating") or row.get("Roadway"),
                    "substructure": row.get("substructure_rating") or row.get("Substructure"),
                    "superstructure": row.get("superstructure_rating") or row.get("Superstructure"),
                    "waterway": row.get("waterway_rating") or row.get("Waterway"),
                    "inlet_outlet": row.get("inlet_outlet_rating") or row.get("Inlet/Outlet"),
                    "structure": row.get("structure_rating") or row.get("Structure"),
                },
            }
    return labels


def image_path_for_record(record):
    for key in ["thumbnail_path", "path"]:
        value = record.get(key)
        if not value:
            continue
        candidate = DEPLOY / value
        if candidate.exists():
            return candidate
    return None


def deterministic_order(items):
    return sorted(items, key=lambda item: hashlib.sha1(str(item.get("image_path", "")).encode("utf-8")).hexdigest())


def build_image_labels():
    structure_labels = build_structure_labels()
    gallery_records = read_json(GALLERY / "index.json")
    image_labels = []
    missing_structure_label = 0
    missing_file = 0

    for record in gallery_records:
        sid = as_id(record.get("structure_id"))
        if not sid:
            continue
        image_path = image_path_for_record(record)
        if not image_path:
            missing_file += 1
            continue
        source = structure_labels.get(sid)
        if not source:
            missing_structure_label += 1
            continue
        condition = source["condition_label"]
        training_eligible = (
            condition in TRAINABLE_CONDITIONS
            and source.get("condition_confidence") == "high"
            and source.get("active_structure") is not False
        )
        image_labels.append(
            {
                "image_path": str(image_path.relative_to(DEPLOY)).replace("\\", "/"),
                "thumbnail_path": record.get("thumbnail_path"),
                "structure_id": sid,
                "structure_type": source["structure_type"],
                "structure_name": source["structure_name"],
                "capture_year": record.get("capture_year"),
                "sequence": record.get("sequence"),
                "condition_label": condition,
                "overall_rating": source.get("overall_rating"),
                "condition_confidence": source.get("condition_confidence"),
                "training_eligible": training_eligible,
                "training_exclusion_reason": None
                if training_eligible
                else "requires high-confidence active structure with trainable inspection condition",
                "condition_source_workbook": source.get("condition_source_workbook"),
                "condition_source_sheet": source.get("condition_source_sheet"),
                "components": source.get("components"),
                "match_method": record.get("match_method"),
                "naming_status": record.get("naming_status"),
            }
        )

    label_payload = {
        "generated_at": TODAY,
        "label_policy": {
            "source": "NBMS corrected bridge/culvert condition feeds plus gallery/index.json",
            "training_eligible_rule": "Only high-confidence active structures in Critical/Poor/Marginal/Satisfactory/Good are used for training.",
            "replaced_retired_rule": "Retired or replaced historical structures are labeled but excluded from model training.",
        },
        "image_count": len(image_labels),
        "missing_structure_label_count": missing_structure_label,
        "missing_file_count": missing_file,
        "condition_counts": dict(sorted(Counter(item["condition_label"] for item in image_labels).items())),
        "training_eligible_counts": dict(sorted(Counter(item["condition_label"] for item in image_labels if item["training_eligible"]).items())),
        "labels": deterministic_order(image_labels),
    }
    write_json(DATA / "image_inspection_labels.json", label_payload)
    return label_payload


def load_image_vector(relative_path):
    image_path = DEPLOY / relative_path
    with Image.open(image_path) as image:
        image = ImageOps.exif_transpose(image).convert("RGB").resize(IMAGE_SIZE, Image.Resampling.BILINEAR)
        array = np.asarray(image, dtype=np.float32) / 255.0
    return array.reshape(-1)


def sample_training_labels(labels):
    eligible = [item for item in labels if item["training_eligible"] and item["condition_label"] in TRAINABLE_CONDITIONS]
    by_class = defaultdict(list)
    for item in deterministic_order(eligible):
        by_class[item["condition_label"]].append(item)
    if len(eligible) <= MAX_TRAIN_IMAGES:
        return deterministic_order(eligible)
    class_names = [label for label in TRAINABLE_CONDITIONS if by_class.get(label)]
    per_class = max(1, MAX_TRAIN_IMAGES // max(1, len(class_names)))
    sampled = []
    overflow = []
    for label in class_names:
        rows = by_class[label]
        sampled.extend(rows[:per_class])
        overflow.extend(rows[per_class:])
    if len(sampled) < MAX_TRAIN_IMAGES:
        sampled.extend(deterministic_order(overflow)[: MAX_TRAIN_IMAGES - len(sampled)])
    return deterministic_order(sampled[:MAX_TRAIN_IMAGES])


def softmax(logits):
    logits = logits - logits.max(axis=1, keepdims=True)
    exp = np.exp(logits)
    return exp / exp.sum(axis=1, keepdims=True)


def train_model(label_payload):
    selected = sample_training_labels(label_payload["labels"])
    class_names = [label for label in TRAINABLE_CONDITIONS if any(item["condition_label"] == label for item in selected)]
    if len(class_names) < 2:
        report = {
            "generated_at": TODAY,
            "status": "skipped",
            "reason": "Fewer than two trainable condition classes were available.",
            "training_image_count": len(selected),
            "class_names": class_names,
        }
        write_json(MODEL_DIR / "training_report.json", report)
        write_json(DATA / "image_model_training_report.json", report)
        return report

    class_to_index = {label: index for index, label in enumerate(class_names)}
    vectors = []
    targets = []
    used = []
    load_failures = []
    for item in selected:
        try:
            vectors.append(load_image_vector(item["image_path"]))
            targets.append(class_to_index[item["condition_label"]])
            used.append(item)
        except Exception as exc:
            load_failures.append({"image_path": item["image_path"], "error": f"{type(exc).__name__}: {exc}"})

    x = np.asarray(vectors, dtype=np.float32)
    y = np.asarray(targets, dtype=np.int64)
    order = np.argsort([hashlib.sha1(item["image_path"].encode("utf-8")).hexdigest() for item in used])
    x, y = x[order], y[order]
    validation_indices = []
    train_indices = []
    for class_index in range(len(class_names)):
        indices = np.where(y == class_index)[0]
        if len(indices) <= 1:
            train_indices.extend(indices.tolist())
            continue
        validation_count = max(1, len(indices) // 5)
        validation_indices.extend(indices[:validation_count].tolist())
        train_indices.extend(indices[validation_count:].tolist())
    x_val, y_val = x[validation_indices], y[validation_indices]
    x_train, y_train = x[train_indices], y[train_indices]
    if len(x_train) == 0:
        x_train, y_train = x, y
        x_val, y_val = x, y

    rng = np.random.default_rng(RANDOM_SEED)
    input_dim = int(np.prod(IMAGE_SIZE) * 3)
    hidden_dim = 96
    num_classes = len(class_names)
    w1 = rng.normal(0, math.sqrt(2.0 / input_dim), size=(input_dim, hidden_dim)).astype(np.float32)
    b1 = np.zeros(hidden_dim, dtype=np.float32)
    w2 = rng.normal(0, math.sqrt(2.0 / hidden_dim), size=(hidden_dim, num_classes)).astype(np.float32)
    b2 = np.zeros(num_classes, dtype=np.float32)

    train_counts = Counter(y_train.tolist())
    class_weights = np.asarray(
        [len(y_train) / (num_classes * max(1, train_counts[index])) for index in range(num_classes)],
        dtype=np.float32,
    )
    learning_rate = 0.06
    epoch_metrics = []
    best_state = None
    best_validation_accuracy = -1.0
    best_epoch = 0
    for epoch in range(1, EPOCHS + 1):
        permutation = rng.permutation(len(x_train))
        x_train = x_train[permutation]
        y_train = y_train[permutation]
        losses = []
        for start in range(0, len(x_train), BATCH_SIZE):
            xb = x_train[start : start + BATCH_SIZE]
            yb = y_train[start : start + BATCH_SIZE]
            z1 = xb @ w1 + b1
            h1 = np.maximum(z1, 0)
            logits = h1 @ w2 + b2
            probs = softmax(logits)
            weights = class_weights[yb]
            losses.append(float((-np.log(probs[np.arange(len(yb)), yb] + 1e-8) * weights).mean()))
            grad = probs
            grad[np.arange(len(yb)), yb] -= 1.0
            grad *= weights[:, None] / max(1, len(yb))
            dw2 = h1.T @ grad
            db2 = grad.sum(axis=0)
            dh1 = grad @ w2.T
            dz1 = dh1 * (z1 > 0)
            dw1 = xb.T @ dz1
            db1 = dz1.sum(axis=0)
            w1 -= learning_rate * dw1
            b1 -= learning_rate * db1
            w2 -= learning_rate * dw2
            b2 -= learning_rate * db2
        train_pred = predict_classes(x_train, w1, b1, w2, b2)
        val_pred = predict_classes(x_val, w1, b1, w2, b2)
        epoch_metrics.append(
            {
                "epoch": epoch,
                "loss": round(float(np.mean(losses)) if losses else 0.0, 4),
                "train_accuracy": round(float((train_pred == y_train).mean()), 4),
                "validation_accuracy": round(float((val_pred == y_val).mean()), 4),
            }
        )
        validation_accuracy = float((val_pred == y_val).mean())
        if validation_accuracy > best_validation_accuracy:
            best_validation_accuracy = validation_accuracy
            best_epoch = epoch
            best_state = (w1.copy(), b1.copy(), w2.copy(), b2.copy())

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    if best_state is not None:
        w1, b1, w2, b2 = best_state
    np.savez_compressed(
        MODEL_DIR / "condition_mlp_v0.npz",
        w1=w1,
        b1=b1,
        w2=w2,
        b2=b2,
        image_width=IMAGE_SIZE[0],
        image_height=IMAGE_SIZE[1],
        class_names=np.asarray(class_names),
    )
    label_map = {"class_names": class_names, "class_to_index": class_to_index}
    write_json(MODEL_DIR / "label_map.json", label_map)
    report = {
        "generated_at": TODAY,
        "status": "trained",
        "model_kind": "pure_numpy_mlp_image_condition_classifier",
        "model_path": "models/image_inspection/condition_mlp_v0.npz",
        "label_map_path": "models/image_inspection/label_map.json",
        "labels_path": "data/image_inspection_labels.json",
        "image_size": list(IMAGE_SIZE),
        "hidden_units": hidden_dim,
        "epochs": EPOCHS,
        "training_image_count": int(len(x_train)),
        "validation_image_count": int(len(x_val)),
        "load_failure_count": len(load_failures),
        "load_failure_sample": load_failures[:20],
        "class_names": class_names,
        "training_class_counts": {class_names[index]: int(count) for index, count in sorted(Counter(y_train.tolist()).items())},
        "validation_class_counts": {class_names[index]: int(count) for index, count in sorted(Counter(y_val.tolist()).items())},
        "epoch_metrics": epoch_metrics,
        "best_epoch": best_epoch,
        "best_validation_accuracy": round(best_validation_accuracy, 4),
        "final_train_accuracy": epoch_metrics[-1]["train_accuracy"],
        "final_validation_accuracy": epoch_metrics[-1]["validation_accuracy"],
        "limitations": [
            "This is a starter backend image-only inspection model trained from corrected NBMS labels.",
            "It should be used for assisted triage and data-quality research until a larger reviewed image-label set is curated.",
            "Inventory extraction tasks such as span count, material and defect localization need additional supervised labels before production use.",
        ],
    }
    write_json(MODEL_DIR / "training_report.json", report)
    write_json(DATA / "image_model_training_report.json", report)
    return report


def predict_classes(x, w1, b1, w2, b2):
    h1 = np.maximum(x @ w1 + b1, 0)
    return np.argmax(h1 @ w2 + b2, axis=1)


def main():
    label_payload = build_image_labels()
    report = train_model(label_payload)
    print(
        json.dumps(
            {
                "labels": label_payload["image_count"],
                "training_eligible_counts": label_payload["training_eligible_counts"],
                "training_status": report["status"],
                "training_image_count": report.get("training_image_count"),
                "validation_accuracy": report.get("best_validation_accuracy"),
                "model_path": report.get("model_path"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
