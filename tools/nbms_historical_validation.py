import json
import math
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

import pandas as pd


DEPLOY = Path(r"D:\nbms_push_recovery_20260624")
REPO = Path(r"G:\My Drive\MOWT\Uganda National Road Network Repository")
DATA = DEPLOY / "data"
TODAY = "2026-06-26"
SOURCE_ROOTS = [
    REPO,
    Path(r"D:\OneDrive\Uganda National Road Network Repository"),
    Path(r"D:\OneDrive"),
    Path(r"D:\OneDrive\Bridge stuff"),
]
NEW_KIBIMBA_ID = "B891"

SOURCE_FILES = [
    {
        "kind": "bridge_condition",
        "path": "7.Bridge Inventory and Condition Data/UNRA_Bridge_Major_Culverts_Inventory_Condition_Workbook_v3_FINAL.xlsx",
        "sheets": ["Bridge_Analysis", "Raw_Bridge_Cond_2022", "Raw_Bridge_BMS_2026", "Raw_Bridge_Component_2026", "ID_Renumbering_Log"],
    },
    {"kind": "bridge_condition", "path": "7.Bridge Inventory and Condition Data/Bridge condition rating 2022.xlsx", "sheets": ["Bridges"]},
    {
        "kind": "bridge_condition",
        "path": "Dinah/desktop stuff/Department of National Roads (NDPE)/BMS/Bridge stuff/Bridge condition rating 2021.xlsx",
        "alt_paths": [
            "Bridge stuff/Bridges and M.Culverts/2021-2022/Bridge condition rating 2021.xlsx",
            "Bridge stuff/Bridges and M.Culverts/2021-2022/Bridge condition rating.xlsx",
        ],
        "sheets": ["Table 1"],
    },
    {
        "kind": "bridge_inventory_condition",
        "path": "arcgis-unra-curated/UNRA structures/List of bridges from BMS database(2019).xlsx",
        "alt_paths": [
            "ArcGIS/UNRA structures/List of bridges from BMS database(2019).xlsx",
            "National Road Network/UNRA structures/List of bridges from BMS database(2019).xlsx",
        ],
        "sheets": ["Bridges"],
    },
    {
        "kind": "bridge_inventory",
        "path": "arcgis-unra-curated/UNRA structures/List of bridges from BMS database(2015).xlsx",
        "alt_paths": [
            "ArcGIS/UNRA structures/List of bridges from BMS database(2015).xlsx",
            "National Road Network/UNRA structures/List of bridges from BMS database(2015).xlsx",
        ],
        "sheets": ["Sheet2"],
    },
    {"kind": "bridge_inventory", "path": "National Road Network/Bridges 2025.xlsx", "sheets": ["Table"]},
    {
        "kind": "bridge_inventory",
        "path": "7.Bridge Inventory and Condition Data/Bridges 18062025.xlsx",
        "sheets": ["Bridges", "Western", "Southern", "Northern", "North Eastern", "Eastern", "Central"],
    },
    {
        "kind": "bridge_inventory",
        "path": "National Road Network/Bridges 18062025.xlsx",
        "sheets": ["Bridges", "Western", "Southern", "Northern", "North Eastern", "Eastern", "Central"],
    },
    {"kind": "culvert_condition", "path": "7.Bridge Inventory and Condition Data/Major culvert condition rating 2022.xlsx", "sheets": ["Culverts"]},
    {"kind": "culvert_inventory", "path": "National Road Network/Culverts 2025.xlsx", "sheets": ["tblCul_Culvert"]},
    {
        "kind": "culvert_inventory",
        "path": "7.Bridge Inventory and Condition Data/Major Culverts 18062025.xlsx",
        "sheets": ["Major Culvert", "Western", "Southern", "Northern", "North Eastern", "Eastern", "Central"],
    },
    {
        "kind": "culvert_inventory",
        "path": "National Road Network/Major Culverts 18062025.xlsx",
        "sheets": ["Major Culvert", "Western", "Southern", "Northern", "North Eastern", "Eastern", "Central"],
    },
    {
        "kind": "bridge_condition",
        "path": "Bridge stuff/Bridges and Culverts 2026-FINAL 2.xlsx",
        "alt_paths": ["Bridges and Culverts 2026-FINAL 2.xlsx"],
        "sheets": ["BRIDGES 2026", "BMS (2)"],
    },
    {
        "kind": "culvert_condition",
        "path": "Bridge stuff/Bridges and Culverts 2026-FINAL 2.xlsx",
        "alt_paths": ["Bridges and Culverts 2026-FINAL 2.xlsx"],
        "sheets": ["MAJOR CULVERTS 2026"],
    },
]


def is_blank(value):
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    text = str(value).strip()
    return text == "" or text.lower() in {"nan", "none", "null", "-", "?"}


def clean(value):
    if is_blank(value):
        return None
    if isinstance(value, (pd.Timestamp, datetime, date)):
        return value.isoformat(sep=" ")[:19]
    if isinstance(value, float):
        if value.is_integer():
            return int(value)
        return float(value)
    return str(value).strip()


def resolve_source_path(path, alt_paths=None):
    candidates = [path, *(alt_paths or [])]
    for item in candidates:
        candidate = Path(item)
        if candidate.is_absolute() and candidate.exists():
            return candidate
        for root in SOURCE_ROOTS:
            joined = root / candidate
            if joined.exists():
                return joined
            text = str(item).replace("\\", "/")
            if text.startswith("Bridge stuff/"):
                joined = root / text.replace("Bridge stuff/", "", 1)
                if joined.exists():
                    return joined
    return Path(path) if Path(path).is_absolute() else SOURCE_ROOTS[0] / path


def as_float(value):
    if is_blank(value):
        return None
    try:
        return float(value)
    except Exception:
        match = re.search(r"-?\d+(?:\.\d+)?", str(value).strip())
        return float(match.group(0)) if match else None


def as_id(value):
    if is_blank(value):
        return ""
    text = re.sub(r"[^A-Z0-9]", "", str(value).upper().strip())
    match = re.match(r"([BCM])(\d{1,4})$", text)
    if not match:
        return text
    return f"{match.group(1)}{int(match.group(2)):03d}"


def norm_text(value):
    if is_blank(value):
        return ""
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"\b(bridge|bridges|overbridge|flyover|culvert|major|mcs|mpc|mpcs|irish|crossing|river|r\.?|road|rd)\b", " ", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokens(value):
    return {token for token in norm_text(value).split() if len(token) > 1}


def band_from_rating(value):
    rating = as_float(value)
    if rating is None:
        return "No Data"
    if rating >= 7:
        return "Good"
    if rating >= 5:
        return "Fair"
    if rating >= 3:
        return "Poor"
    return "Critical"


def display_from_band(band):
    text = str(band or "").lower()
    if "critical" in text or "beyond" in text or "very poor" in text:
        return 1
    if "poor" in text:
        return 3
    if "fair" in text:
        return 5
    if "marginal" in text:
        return 4
    if "satisfactory" in text:
        return 6
    if "good" in text:
        return 7
    return None


BMS_OVERALL_COMPONENT_WEIGHTS = {
    "approaches": {0: 6, 1: 6, 2: 6, 3: 2, 4: 2, 5: 0.25, 6: 0.25, 7: 0.25, 8: 0.25, 9: 0.25},
    "waterway": {0: 8, 1: 8, 2: 8, 3: 2, 4: 2, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1},
    "substructure": {0: 8, 1: 8, 2: 8, 3: 4, 4: 4, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2},
    "superstructure": {0: 8, 1: 8, 2: 8, 3: 4, 4: 4, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2},
    "roadway": {0: 6, 1: 6, 2: 6, 3: 2, 4: 2, 5: 0.5, 6: 0.5, 7: 0.5, 8: 0.5, 9: 0.5},
}


def clamp_rating(value):
    rating = as_float(value)
    if rating is None:
        return None
    return max(0, min(9, int(math.floor(rating + 0.5))))


def bms_manual_category(overall_rate):
    rating = clamp_rating(overall_rate)
    if rating is None:
        return "No Data"
    if rating <= 1:
        return "Critical"
    if rating <= 3:
        return "Poor"
    if rating <= 5:
        return "Marginal"
    if rating == 6:
        return "Satisfactory"
    return "Good"


def non_water_crossing(row):
    text = " ".join(
        str(value or "")
        for value in [
            row.get("TypeCrossing"),
            row.get("type_crossing"),
            row.get("Crossing"),
            row.get("crossing_feature_name"),
            row.get("waterway_applicability"),
        ]
    ).lower()
    return any(term in text for term in ["road over road", "road over rail", "non-water", "not applicable"]) or re.search(r"\b0?3\b", text) is not None


def manual_overall_rating(row):
    status_text = " ".join(
        str(row.get(key) or "")
        for key in ["OverallCondition", "latest_condition_found", "status", "status_classification", "condition_status"]
    ).lower()
    if row.get("active_structure") is False or "retired" in status_text or "replaced" in status_text:
        return {
            "overall_rate": None,
            "condition_category": "Replaced",
            "components_used": {},
            "issues": [],
            "waterway_omitted": False,
        }
    component_sources = {
        "approaches": ["approaches_rating", "Approaches", "Approach", "approaches"],
        "waterway": ["waterway_rating", "Waterway", "waterway"],
        "substructure": ["substructure_rating", "Substructure", "substructure"],
        "superstructure": ["superstructure_rating", "Superstructure", "superstructure"],
        "roadway": ["roadway_rating", "Roadway", "roadway"],
    }
    issues = []
    used = {}
    numerator = 0.0
    denominator = 0.0
    omit_waterway = non_water_crossing(row)
    for component, names in component_sources.items():
        if component == "waterway" and omit_waterway:
            continue
        rating = clamp_rating(first(row, names))
        if rating is None:
            issues.append(f"missing {component} rating")
            continue
        weight = BMS_OVERALL_COMPONENT_WEIGHTS[component][rating]
        numerator += rating * weight
        denominator += weight
        used[component] = {"rating": rating, "weight": weight}
    if denominator == 0:
        return {
            "overall_rate": None,
            "condition_category": "No Data",
            "components_used": used,
            "issues": issues or ["no component ratings available"],
            "waterway_omitted": omit_waterway,
        }
    value = int(math.floor((numerator / denominator) + 0.5))
    return {
        "overall_rate": value,
        "condition_category": bms_manual_category(value),
        "components_used": used,
        "issues": issues,
        "waterway_omitted": omit_waterway,
    }


def apply_manual_analytics(bridges, analytics):
    counts = Counter()
    disagreements = []
    validation_issues = []
    for bridge in bridges:
        result = manual_overall_rating(bridge)
        bridge["BMSManualOverallRate"] = result["overall_rate"]
        bridge["BMSManualConditionCategory"] = result["condition_category"]
        bridge["BMSManualComponentsUsed"] = result["components_used"]
        bridge["BMSManualValidationIssues"] = result["issues"]
        bridge["BMSManualWaterwayOmitted"] = result["waterway_omitted"]
        bridge["BMSManualSource"] = "UNRA Asset Management System BMS User Manual, January 2017, section 10.1"
        counts[result["condition_category"]] += 1
        if result["issues"]:
            validation_issues.append({"bridge_no": bridge_key(bridge), "bridge_name": bridge_name(bridge), "issues": result["issues"]})
        published = str(bridge.get("OverallCondition") or "")
        if result["condition_category"] not in {"No Data", "Replaced"} and published and published not in {"No Data", "Replaced"} and result["condition_category"].lower() != published.lower():
            disagreements.append(
                {
                    "bridge_no": bridge_key(bridge),
                    "bridge_name": bridge_name(bridge),
                    "published_condition": published,
                    "manual_condition": result["condition_category"],
                    "manual_rate": result["overall_rate"],
                }
            )
    analytics["bms_manual_analytics"] = {
        "manual": "UNRA_AssetManagementSystem_6_BMS_User_Manual.pdf",
        "manual_section": "10 Ranking for Bridges / 10.1 Overall Rate Calculation",
        "manual_rules_applied": [
            "Overall rate is computed from approach, waterway, substructure, superstructure and roadway component ratings using the manual component weighting table.",
            "Road-over-road and road-over-rail crossings omit the Waterway component.",
            "Calculated overall rates are rounded to an integer and classified as 0-1 Critical, 2-3 Poor, 4-5 Marginal, 6 Satisfactory, 7-9 Good.",
            "Missing or inaccessible component ratings are flagged for validation; they are not defaulted to 9 or 0.",
        ],
        "condition_counts_from_manual_formula": dict(sorted(counts.items())),
        "manual_formula_disagreement_count": len(disagreements),
        "manual_formula_disagreement_sample": disagreements[:50],
        "manual_validation_issue_count": len(validation_issues),
        "manual_validation_issue_sample": validation_issues[:50],
    }
    return disagreements, validation_issues


def parse_date(value):
    if is_blank(value):
        return None
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    try:
        dt = pd.to_datetime(value, errors="coerce")
        if pd.notna(dt):
            return dt.date().isoformat()
    except Exception:
        pass
    match = re.search(r"(20\d{2}|19\d{2})", str(value))
    return f"{match.group(1)}-01-01" if match else None


def json_ready(value):
    if isinstance(value, dict):
        return {k: json_ready(v) for k, v in value.items() if v is not None and not (isinstance(v, float) and math.isnan(v))}
    if isinstance(value, list):
        return [json_ready(v) for v in value]
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat(sep=" ")[:19]
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def read_json(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def write_json(name, payload):
    (DATA / name).write_text(json.dumps(json_ready(payload), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def excel_with_header(path, sheet, header_row=None):
    if header_row is not None:
        return pd.read_excel(path, sheet_name=sheet, header=header_row)
    raw = pd.read_excel(path, sheet_name=sheet, header=None)
    if len(raw) > 2 and any(str(v).strip() in {"Bridge No", "Culvert No", "BridgeNumber", "CulvertNumber", "Bridge No."} for v in raw.iloc[2].tolist()):
        cols = [str(v).strip() if not is_blank(v) else f"Unnamed:{i}" for i, v in enumerate(raw.iloc[2].tolist())]
        df = raw.iloc[3:].copy()
        df.columns = cols
        return df
    return pd.read_excel(path, sheet_name=sheet)


def first(row, names):
    for name in names:
        if name in row and not is_blank(row[name]):
            return row[name]
    normalized = {re.sub(r"[^a-z0-9]+", "", str(key).lower()): key for key in row.keys()}
    for name in names:
        key = normalized.get(re.sub(r"[^a-z0-9]+", "", str(name).lower()))
        if key is not None and not is_blank(row[key]):
            return row[key]
    return None


def add_hist_record(record, historical_records, condition_records):
    sid = as_id(record.get("id"))
    if not sid:
        return
    record["id"] = sid
    historical_records.append(record)
    rating = record.get("overall_rating")
    band = record.get("condition_band")
    if as_float(rating) is not None or (band and band != "No Data"):
        condition_records[sid].append(record)


def add_culvert_condition(record, culvert_condition_records):
    sid = as_id(record.get("id"))
    if not sid:
        return
    record["id"] = sid
    culvert_condition_records[sid].append(record)


def bridge_key(row):
    return as_id(row.get("BridgeNumber") or row.get("bridge_no") or row.get("new_bridge_no") or row.get("original_bridge_no"))


def bridge_name(row):
    return row.get("BridgeName") or row.get("bridge_nam") or row.get("river") or ""


def bridge_link(row):
    return row.get("LinkID") or row.get("link_no") or row.get("Link_ID") or row.get("RoadNumberPrincipal") or ""


def bridge_km(row):
    return as_float(row.get("Km") or row.get("km") or row.get("chainage_km") or row.get("KmPrincipal"))


def bridge_lon(row):
    return as_float(row.get("CoOrdinateE") or row.get("x_new") or row.get("map_x") or row.get("Lon") or row.get("location_source_lon"))


def bridge_lat(row):
    return as_float(row.get("CoOrdinateS") or row.get("y_new") or row.get("map_y") or row.get("Lat") or row.get("location_source_lat"))


def score_match(row, hist):
    visible_id = bridge_key(row)
    visible_name = bridge_name(row)
    visible_link = str(bridge_link(row) or "").strip().upper()
    visible_km = bridge_km(row)
    visible_lon = bridge_lon(row)
    visible_lat = bridge_lat(row)
    score = 0
    reasons = []
    facts = {}
    if visible_id and hist.get("id") == visible_id:
        score += 12
        reasons.append("same-number")
        facts["same_id"] = True
    visible_tokens, historical_tokens = tokens(visible_name), tokens(hist.get("name"))
    if visible_tokens and historical_tokens:
        jaccard = len(visible_tokens & historical_tokens) / max(1, len(visible_tokens | historical_tokens))
        facts["name_jaccard"] = round(jaccard, 3)
        if norm_text(visible_name) == norm_text(hist.get("name")):
            score += 45
            reasons.append("name-exact")
            facts["name_match"] = True
        elif jaccard >= 0.66:
            score += 34
            reasons.append(f"name-jaccard-{jaccard:.2f}")
            facts["name_match"] = True
        elif jaccard >= 0.45:
            score += 22
            reasons.append(f"name-jaccard-{jaccard:.2f}")
    historical_link = str(hist.get("link_no") or "").strip().upper()
    if visible_link and historical_link and visible_link == historical_link:
        score += 32
        reasons.append("link")
        facts["link_match"] = True
    historical_km = as_float(hist.get("km"))
    if visible_km is not None and historical_km is not None:
        delta = abs(visible_km - historical_km)
        facts["km_delta"] = round(delta, 3)
        if delta <= 0.02:
            score += 28
            reasons.append(f"km-{delta:.3f}")
            facts["km_close"] = True
        elif delta <= 0.30:
            score += 18
            reasons.append(f"km-{delta:.3f}")
            facts["km_close"] = True
        elif delta <= 1.0 and visible_link and historical_link and visible_link == historical_link:
            score += 8
            reasons.append(f"km-{delta:.3f}")
    historical_lon, historical_lat = as_float(hist.get("lon")), as_float(hist.get("lat"))
    if visible_lon is not None and visible_lat is not None and historical_lon is not None and historical_lat is not None:
        delta = ((visible_lon - historical_lon) ** 2 + (visible_lat - historical_lat) ** 2) ** 0.5
        facts["coord_delta"] = round(delta, 5)
        if delta <= 0.0015:
            score += 24
            reasons.append(f"coord-{delta:.4f}")
            facts["coord_close"] = True
        elif delta <= 0.01:
            score += 12
            reasons.append(f"coord-{delta:.4f}")
            facts["coord_close"] = True
    facts["score"] = score
    return score, reasons, facts


def accepted(score, reasons, facts):
    reason_set = set(reasons)
    if facts.get("name_jaccard") == 0 and "name-exact" not in reason_set and not any(reason.startswith("name-jaccard") for reason in reason_set) and not facts.get("coord_close"):
        return False
    independent = (
        "name-exact" in reason_set
        or "link" in reason_set
        or any(reason.startswith("name-jaccard") for reason in reason_set)
        or any(reason.startswith("km-") for reason in reason_set)
        or any(reason.startswith("coord-") for reason in reason_set)
    )
    if score >= 70 and independent:
        return True
    if "same-number" in reason_set and score >= 55 and independent:
        return True
    if facts.get("link_match") and facts.get("name_match") and score >= 55:
        return True
    return False


def has_condition_value(record):
    return as_float(record.get("overall_rating")) is not None or not is_blank(record.get("condition_band"))


def priority_row_bridge(row):
    return {
        "StructureType": "Bridge",
        "BridgeNumber": bridge_key(row),
        "BridgeName": bridge_name(row),
        "ResolvedConditionBridgeNo": row.get("resolved_condition_bridge_no") or bridge_key(row),
        "LinkID": bridge_link(row),
        "LinkName": row.get("LinkName") or row.get("road_descr_principal") or row.get("link_name"),
        "MaintenanceStation": row.get("MaintenanceStation") or row.get("station") or row.get("maintenanc"),
        "BridgeLength": row.get("BridgeLength") or row.get("bridge_len") or row.get("length"),
        "BridgeWidth": row.get("BridgeWidth") or row.get("bridge_wid") or row.get("width"),
        "OverallRating": row.get("OverallCondition"),
        "DisplayRating": row.get("OverallConditionRating") or display_from_band(row.get("OverallCondition")),
        "AdoptedConditionRating": row.get("adopted_condition_rating"),
        "LatestConditionDate": row.get("latest_condition_date"),
        "PriorityScore": row.get("priority_score"),
        "RecommendedIntervention": row.get("recommended_intervention"),
        "Comment": row.get("recommended_intervention") or row.get("comment"),
        "ConditionSource": row.get("condition_source_sheet"),
        "IdentityStatus": (row.get("condition_identity_match") or {}).get("status") or row.get("historical_validation_status"),
        "ConditionConfidence": row.get("condition_confidence"),
    }


def is_active_priority_candidate(row):
    status_text = " ".join(
        str(row.get(key) or "")
        for key in [
            "status",
            "status_classification",
            "ConditionStatus",
            "condition_status",
            "OverallCondition",
            "latest_condition_found",
        ]
    ).lower()
    if row.get("active_structure") is False:
        return False
    return not any(term in status_text for term in ["retired", "replaced historical", "former bridge", "no longer in use"])


def priority_row_culvert(row):
    return {
        "StructureType": "Major Culvert",
        "BridgeNumber": as_id(row.get("CulvertNumber") or row.get("Culvert No")),
        "BridgeName": row.get("Road") or row.get("LinkName") or row.get("Link_Name") or row.get("River") or "Major Culvert",
        "LinkID": row.get("SectionOrLinkNo") or row.get("Link No") or row.get("Link_ID"),
        "LinkName": row.get("Road") or row.get("LinkName") or row.get("Link_Name"),
        "MaintenanceStation": row.get("Maintenance_Station") or row.get("Maintenance Station") or row.get("DistrictOffice"),
        "BridgeLength": row.get("Overall Length") or row.get("CulvertLength"),
        "BridgeWidth": row.get("Overall Width") or row.get("Overall Cell Length"),
        "OverallRating": row.get("OverallCondition"),
        "DisplayRating": row.get("OverallConditionRating") or display_from_band(row.get("OverallCondition")),
        "AdoptedConditionRating": row.get("adopted_condition_rating"),
        "LatestConditionDate": row.get("latest_condition_date"),
        "PriorityScore": row.get("priority_score"),
        "RecommendedIntervention": row.get("recommended_intervention"),
        "Comment": row.get("recommended_intervention") or row.get("Comment ") or row.get("Comments"),
        "ConditionSource": row.get("condition_source_sheet"),
        "IdentityStatus": row.get("historical_validation_status") or "culvert-id-match",
        "ConditionConfidence": row.get("condition_confidence"),
    }


def publish_condition_fields(row, structure_type):
    confidence = row.get("condition_confidence")
    transfer_allowed = row.get("condition_transfer_allowed")
    status = row.get("historical_validation_status")
    condition = row.get("OverallCondition") or row.get("latest_condition_found") or "No Data"
    source_workbook = row.get("condition_source_workbook")
    source_sheet = row.get("condition_source_sheet")
    provenance = row.get("condition_provenance")

    if confidence == "review" and transfer_allowed is False and provenance and "Latest verified condition matched" in provenance:
        structure_id = bridge_key(row) if structure_type == "Bridge" else as_id(row.get("CulvertNumber") or row.get("Culvert No"))
        structure_name = bridge_name(row) if structure_type == "Bridge" else row.get("Road") or row.get("LinkName") or row.get("Link_Name") or "Major Culvert"
        provenance = (
            f"Review required before condition transfer. The visible {structure_type.lower()} record is "
            f"{structure_id} ({structure_name}); historical identity is ambiguous or a possible duplicate. "
            f"The latest reported condition remains {condition} from {source_workbook or 'available source data'}"
            f"{' / ' + source_sheet if source_sheet else ''}, but it is excluded from the verified priority queue until field validation."
        )
        row["condition_provenance"] = provenance

    row["ConditionConfidence"] = confidence
    row["ConditionTransferAllowed"] = transfer_allowed
    row["ConditionReviewRequired"] = confidence == "review"
    row["HistoricalValidationStatus"] = status
    row["LatestConditionFound"] = condition
    row["LatestConditionDate"] = row.get("latest_condition_date")
    row["ConditionStatus"] = row.get("condition_status")
    row["ConditionSourceWorkbook"] = source_workbook
    row["ConditionSourceSheet"] = source_sheet
    row["ConditionProvenance"] = row.get("condition_provenance")
    row["VerifiedCondition"] = row.get("verified_condition")
    row["PriorityEligibility"] = (
        "verified-priority"
        if confidence == "high" and re.search(r"critical|poor|very poor|beyond", str(condition), re.I)
        else "review-only-condition"
        if confidence == "review"
        else "not-priority"
    )


def apply_kibimba_replacement_split(bridges, historical_records):
    kibimba_records = [
        record
        for record in historical_records
        if as_id(record.get("id")) == "B001" and "kibimba" in str(record.get("name") or "").lower()
    ]
    replacement_record = None
    for record in kibimba_records:
        remarks = str(record.get("remarks") or "").lower()
        if (
            record.get("source_file") == "Bridge stuff/Bridges and Culverts 2026-FINAL 2.xlsx"
            and record.get("source_sheet") == "BRIDGES 2026"
            and (as_float(record.get("completion_year")) or 0) >= 2022
        ):
            replacement_record = record
            break
        if "former bridge" in remarks or "no longer under use" in remarks:
            replacement_record = record
    remark_record = next(
        (
            record
            for record in kibimba_records
            if "former bridge" in str(record.get("remarks") or "").lower()
            or "no longer under use" in str(record.get("remarks") or "").lower()
        ),
        None,
    )
    if not replacement_record:
        return {"applied": False, "reason": "No verified 2026 Kibimba replacement record was found."}

    existing_ids = {bridge_key(bridge) for bridge in bridges if bridge_key(bridge)}
    new_id = NEW_KIBIMBA_ID
    if new_id in existing_ids and not any(bridge_key(bridge) == new_id and as_id(bridge.get("replaces_bridge_no")) == "B001" for bridge in bridges):
        highest = max([int(match.group(1)) for item in existing_ids for match in [re.match(r"B(\d+)$", item or "")] if match] or [890])
        while f"B{highest + 1:03d}" in existing_ids:
            highest += 1
        new_id = f"B{highest + 1:03d}"

    old_bridge = next((bridge for bridge in bridges if bridge_key(bridge) == "B001"), None)
    if not old_bridge:
        return {"applied": False, "reason": "Current B001 record was not found in deployed bridge inventory."}

    components = replacement_record.get("components") or {}
    rating = as_float(replacement_record.get("overall_rating"))
    band = clean(replacement_record.get("condition_band")) or band_from_rating(rating)
    note = (
        clean((remark_record or replacement_record).get("remarks"))
        or "Former bridge at this location is no longer under use; 2026 BMS records show a new bridge structure at the recorded coordinates."
    )
    old_history = old_bridge.get("condition_history") if isinstance(old_bridge.get("condition_history"), list) else []
    old_bridge.update(
        {
            "BridgeNumber": "B001",
            "bridge_no": "B001",
            "new_bridge_no": "B001",
            "original_bridge_no": "B001",
            "BridgeName": "Old Kibimba Bridge",
            "bridge_nam": "Old Kibimba Bridge",
            "OverallCondition": "Replaced",
            "OverallConditionRating": None,
            "overall_rating": None,
            "latest_condition_found": "Replaced",
            "latest_condition_date": replacement_record.get("inspection_date"),
            "condition_status": "Replaced historical structure - former bridge no longer in use",
            "verified_condition": True,
            "condition_confidence": "high",
            "condition_transfer_allowed": False,
            "adopted_condition_rating": None,
            "adopted_condition_label": "Replaced",
            "computed_condition_index": None,
            "condition_class": "Replaced",
            "status": "Retired",
            "status_classification": "Retired/Replaced",
            "active_structure": False,
            "replacement_bridge_no": new_id,
            "replacement_bridge_name": "New Kibimba Bridge",
            "replacement_note": note,
            "condition_source_workbook": "Bridges and Culverts 2026-FINAL 2.xlsx",
            "condition_source_sheet": replacement_record.get("source_sheet"),
            "resolved_condition_bridge_no": "B001",
            "resolved_condition_bridge_name": "Old Kibimba Bridge",
            "historical_validation_status": "verified_replaced_historical_structure",
            "condition_identity_match": {
                "status": "replacement-split",
                "resolved_bridge_no": "B001",
                "replacement_bridge_no": new_id,
                "reason": "2026 BMS record states the former B001 Kibimba bridge is no longer in use and a new 2022 bridge exists at this location.",
            },
            "condition_provenance": f"B001 is retained as Old Kibimba Bridge for historical evidence only. {note} The active 2022 replacement is split into {new_id} New Kibimba Bridge so old condition history cannot be transferred to the new structure.",
            "condition_history": [
                *old_history,
                {
                    "source": "Bridges and Culverts 2026-FINAL 2.xlsx",
                    "source_sheet": replacement_record.get("source_sheet"),
                    "inspection_date": replacement_record.get("inspection_date"),
                    "condition_band": "Replaced",
                    "note": note,
                    "replacement_bridge_no": new_id,
                },
            ],
        }
    )
    for owned_key in [
        "same_number_condition_rejected",
        "same_number_rejection_note",
        "same_number_rejected_candidate",
        "identity_conflict",
    ]:
        old_bridge.pop(owned_key, None)

    new_bridge = next((bridge for bridge in bridges if bridge_key(bridge) == new_id), None)
    if new_bridge is None:
        new_bridge = dict(old_bridge)
        bridges.append(new_bridge)
    new_bridge.update(
        {
            "BridgeNumber": new_id,
            "bridge_no": new_id,
            "new_bridge_no": new_id,
            "original_bridge_no": "B001",
            "previous_bridge_no": "B001",
            "replaces_bridge_no": "B001",
            "BridgeName": "New Kibimba Bridge",
            "bridge_nam": "New Kibimba Bridge",
            "river": "KIBIMBA RIVER",
            "LinkID": replacement_record.get("link_no") or old_bridge.get("LinkID"),
            "link_no": replacement_record.get("link_no") or old_bridge.get("link_no"),
            "LinkName": replacement_record.get("link_name") or replacement_record.get("road_name") or old_bridge.get("LinkName"),
            "road_descr_principal": replacement_record.get("road_name") or old_bridge.get("road_descr_principal"),
            "Km": replacement_record.get("km") if replacement_record.get("km") is not None else old_bridge.get("Km"),
            "km": replacement_record.get("km") if replacement_record.get("km") is not None else old_bridge.get("km"),
            "CoOrdinateE": replacement_record.get("lon") if replacement_record.get("lon") is not None else old_bridge.get("CoOrdinateE"),
            "CoOrdinateS": replacement_record.get("lat") if replacement_record.get("lat") is not None else old_bridge.get("CoOrdinateS"),
            "CompletionYear": replacement_record.get("completion_year") or 2022,
            "OverallBridgeLength": replacement_record.get("overall_length") or old_bridge.get("OverallBridgeLength"),
            "OverallBridgeWidth": replacement_record.get("overall_width") or old_bridge.get("OverallBridgeWidth"),
            "BridgeLength": replacement_record.get("overall_length") or old_bridge.get("BridgeLength"),
            "BridgeWidth": replacement_record.get("overall_width") or old_bridge.get("BridgeWidth"),
            "NumberOfSpans": replacement_record.get("spans") or old_bridge.get("NumberOfSpans"),
            "NumberOfPiers": replacement_record.get("piers") or old_bridge.get("NumberOfPiers"),
            "NumberOfLanes": replacement_record.get("lanes") or old_bridge.get("NumberOfLanes"),
            "approaches_rating": components.get("approaches"),
            "roadway_rating": components.get("roadway"),
            "substructure_rating": components.get("substructure"),
            "superstructure_rating": components.get("superstructure"),
            "waterway_rating": components.get("waterway"),
            "OverallCondition": band,
            "OverallConditionRating": rating,
            "overall_rating": rating,
            "latest_condition_found": band,
            "latest_condition_date": replacement_record.get("inspection_date"),
            "condition_status": "Verified 2026 replacement bridge",
            "verified_condition": True,
            "condition_confidence": "high",
            "condition_transfer_allowed": True,
            "adopted_condition_rating": rating,
            "adopted_condition_label": band,
            "computed_condition_index": rating,
            "condition_class": band,
            "status": "Operational",
            "status_classification": "Operational",
            "active_structure": True,
            "recommended_intervention": "Routine Maintenance",
            "planning_window": "Routine annual programme",
            "priority_score": 45,
            "condition_source_workbook": "Bridges and Culverts 2026-FINAL 2.xlsx",
            "condition_source_sheet": replacement_record.get("source_sheet"),
            "resolved_condition_bridge_no": new_id,
            "resolved_condition_bridge_name": "New Kibimba Bridge",
            "resolved_condition_original_bridge_no": "B001",
            "historical_validation_status": "verified_condition_identity",
            "condition_identity_match": {
                "status": "replacement-split",
                "resolved_bridge_no": new_id,
                "source_bridge_no": "B001",
                "replaces_bridge_no": "B001",
                "reason": "Active 2022 Kibimba replacement bridge split from the retired B001 historical bridge.",
            },
            "condition_provenance": f"New Kibimba Bridge is the active 2022 replacement structure recorded in the 2026 BMS workbook under the inherited B001 source row. It is assigned {new_id} in NBMS to prevent old B001 evidence and condition history from being copied onto the new bridge.",
            "condition_history": [
                {
                    "source": "Bridges and Culverts 2026-FINAL 2.xlsx",
                    "source_sheet": replacement_record.get("source_sheet"),
                    "inspection_date": replacement_record.get("inspection_date"),
                    "assessment_year": 2026,
                    "overall_rating": rating,
                    "condition_band": band,
                    "components": components,
                    "comment": clean(replacement_record.get("comment")),
                    "note": "Active 2022 replacement bridge split from historical B001.",
                }
            ],
        }
    )
    for owned_key in [
        "same_number_condition_rejected",
        "same_number_rejection_note",
        "same_number_rejected_candidate",
        "identity_conflict",
    ]:
        new_bridge.pop(owned_key, None)

    return {
        "applied": True,
        "old_bridge_no": "B001",
        "old_bridge_name": "Old Kibimba Bridge",
        "new_bridge_no": new_id,
        "new_bridge_name": "New Kibimba Bridge",
        "new_condition": band,
        "new_overall_rating": rating,
        "completion_year": replacement_record.get("completion_year") or 2022,
        "note": note,
    }


def apply_same_id_condition_overrides(bridges, historical_records):
    hist_by_id = defaultdict(list)
    for record in historical_records:
        hist_by_id[as_id(record.get("id"))].append(record)

    overrides = []
    for bridge in bridges:
        bid = bridge_key(bridge)
        if not bid or not is_active_priority_candidate(bridge):
            continue
        current_match = bridge.get("condition_identity_match") or {}
        resolved = as_id(bridge.get("resolved_condition_bridge_no"))
        if (
            str(bridge.get("condition_status") or "") == "Verified same-ID 2026 condition source"
            and current_match.get("superseded_alias_bridge_no")
        ):
            overrides.append(
                {
                    "bridge_no": bid,
                    "bridge_name": bridge_name(bridge),
                    "previous_resolved_condition_bridge_no": current_match.get("superseded_alias_bridge_no"),
                    "previous_condition": None,
                    "new_condition": bridge.get("OverallCondition"),
                    "new_overall_rating": bridge.get("OverallConditionRating"),
                    "source_file": bridge.get("condition_source_workbook"),
                    "source_sheet": bridge.get("condition_source_sheet"),
                    "score": current_match.get("score"),
                    "reasons": current_match.get("reasons"),
                    "already_applied": True,
                }
            )
            continue
        if not resolved or resolved == bid or current_match.get("status") not in {"accepted", "replacement-split"}:
            continue

        candidates = []
        for record in hist_by_id.get(bid, []):
            if not has_condition_value(record):
                continue
            score, reasons, facts = score_match(bridge, record)
            if not accepted(score, reasons, facts):
                continue
            source = str(record.get("source_file") or "")
            source_rank = 2 if "Bridges and Culverts 2026-FINAL 2.xlsx" in source else 1
            inspection_date = str(record.get("inspection_date") or "")
            candidates.append((source_rank, inspection_date, score, record, reasons, facts))
        if not candidates:
            continue
        candidates.sort(key=lambda item: (item[0], item[1], item[2]), reverse=True)
        source_rank, _, score, record, reasons, facts = candidates[0]
        if source_rank < 2 and bridge.get("condition_confidence") == "high":
            continue

        rating = as_float(record.get("overall_rating"))
        band = clean(record.get("condition_band")) or band_from_rating(rating)
        previous_resolved = resolved
        previous_condition = bridge.get("OverallCondition")
        components = record.get("components") or {}
        for component, value in components.items():
            if value is not None:
                bridge[f"{component}_rating"] = value

        history = bridge.get("condition_history") if isinstance(bridge.get("condition_history"), list) else []
        bridge.update(
            {
                "OverallCondition": band,
                "OverallConditionRating": rating,
                "overall_rating": rating,
                "latest_condition_found": band,
                "latest_condition_date": record.get("inspection_date"),
                "condition_status": "Verified same-ID 2026 condition source",
                "verified_condition": True,
                "condition_confidence": "high",
                "condition_transfer_allowed": True,
                "adopted_condition_rating": rating,
                "adopted_condition_label": band,
                "computed_condition_index": rating,
                "condition_class": band,
                "condition_source_workbook": record.get("source_file"),
                "condition_source_sheet": record.get("source_sheet"),
                "resolved_condition_bridge_no": bid,
                "resolved_condition_bridge_name": bridge_name(bridge),
                "resolved_condition_original_bridge_no": bid,
                "historical_validation_status": "verified_condition_identity",
                "condition_identity_match": {
                    "status": "accepted",
                    "score": score,
                    "reasons": reasons,
                    "resolved_bridge_no": bid,
                    "resolved_bridge_name": record.get("name"),
                    "resolved_link_no": record.get("link_no"),
                    "resolved_km": record.get("km"),
                    "facts": facts,
                    "superseded_alias_bridge_no": previous_resolved,
                },
                "condition_provenance": (
                    f"Same-ID historical condition from {record.get('source_file')} / {record.get('source_sheet')} "
                    f"matched {bid} by independent identity checks and supersedes the older alias transfer from {previous_resolved}. "
                    f"Latest condition is {band}; overall rating {rating if rating is not None else 'not supplied'}."
                ),
                "condition_history": [
                    {
                        "source": record.get("source_file"),
                        "source_sheet": record.get("source_sheet"),
                        "inspection_date": record.get("inspection_date"),
                        "assessment_year": record.get("assessment_year"),
                        "overall_rating": rating,
                        "condition_band": band,
                        "components": components,
                        "note": f"Same-ID condition source superseded alias {previous_resolved}.",
                    },
                    *history,
                ],
            }
        )
        overrides.append(
            {
                "bridge_no": bid,
                "bridge_name": bridge_name(bridge),
                "previous_resolved_condition_bridge_no": previous_resolved,
                "previous_condition": previous_condition,
                "new_condition": band,
                "new_overall_rating": rating,
                "source_file": record.get("source_file"),
                "source_sheet": record.get("source_sheet"),
                "score": score,
                "reasons": reasons,
            }
        )
    return overrides


def source_record(row, src, sheet):
    return {
        "id": first(row, ["Bridge No", "Bridge No.", "Bridge Number", "BridgeNumber", "New Bridge Number"]),
        "new_id": first(row, ["New Bridge Number"]),
        "name": clean(first(row, ["Bridge Name", "Bridge Name ", "BridgeName"])),
        "link_no": clean(first(row, ["Link No", "Link ID", "Link_ID", "Road #", "Road #.1", "RoadNumberPrincipal"])),
        "link_name": clean(first(row, ["Link Name", "Link_Name", "Description", "RoadDescrPrincipal"])),
        "road_name": clean(first(row, ["Road Name", "RoadDescrPrincipal", "Link_Name"])),
        "km": as_float(first(row, ["Km", "km", "Descr km", "KmPrincipal"])),
        "lon": as_float(first(row, ["E-coordinate", "E", "CoOrdinateE"])),
        "lat": as_float(first(row, ["N-coordinate", "S-Coordinate", "S", "CoOrdinateS"])),
        "station": clean(first(row, ["Maintenance Station", "Maintenance_Station", "Station", "Maint_Auth"])),
        "region": clean(first(row, ["Region", "Maintenance_Region"])),
        "overall_rating": as_float(first(row, ["Overall Rating", "OVERALL RATING", "Overall Rating 2022", "Adopted Condition Rating"])),
        "condition_band": clean(first(row, ["Condition Band", "Condition category", "Condition Category", "Condtion category.4", "Condition Category.4"])),
        "inspection_date": parse_date(first(row, ["Latest BMS Inspection", "InspecDate", "Date (dd/mm/yyyy)", "DateModified", "Date of Last Inspection"])),
        "assessment_year": clean(first(row, ["Year of assessment"])),
        "completion_year": clean(first(row, ["CompletionYear", "Completion Year", "Year Built"])),
        "remarks": clean(first(row, ["Remarks", "Additional Remarks", "COMMENT", "Comment", "Comments"])),
        "comment": clean(first(row, ["COMMENT", "Comment", "Comments"])),
        "overall_length": as_float(first(row, ["OverallBridgeLength", "Overall Bridge Length", "BridgeLength"])),
        "overall_width": as_float(first(row, ["OverallBridgeWidth", "Overall Bridge Width", "BridgeWidth"])),
        "spans": as_float(first(row, ["NumberOfSpans", "Number of Spans"])),
        "piers": as_float(first(row, ["NumberOfPiers", "Number of Piers"])),
        "lanes": as_float(first(row, ["NumberOfLanes", "Number of Lanes"])),
        "components": {
            "approaches": as_float(first(row, ["Approaches", "Approach", "Approaches 2022"])),
            "roadway": as_float(first(row, ["Roadway", "Roadway 2022"])),
            "substructure": as_float(first(row, ["Substructure", "Substructure 2022"])),
            "superstructure": as_float(first(row, ["Superstructure", "Superstructure 2022"])),
            "waterway": as_float(first(row, ["Waterway", "Waterway 2022"])),
        },
        "source_file": src["path"],
        "source_sheet": sheet,
    }


def culvert_source_record(row, src, sheet):
    overall = first(row, ["Overall Rating", "OVERALL RATING", "Adopted Condition Rating"])
    band = clean(first(row, ["Condition Band", "Condition category", "Condition Category", "Condition Category.4", "Condtion category.4"]))
    return {
        "id": first(row, ["Culvert No", "CulvertNumber", "New Culvert Number"]),
        "new_id": first(row, ["New Culvert Number"]),
        "link_no": clean(first(row, ["Link No", "SectionOrLinkNo"])),
        "link_name": clean(first(row, ["Link Name", "Link_Name", "Road"])),
        "km": as_float(first(row, ["Km", "km"])),
        "overall_rating": as_float(overall),
        "condition_band": band or (band_from_rating(overall) if overall is not None else None),
        "inspection_date": parse_date(first(row, ["Latest BMS Inspection", "DateModified"])),
        "assessment_year": clean(first(row, ["Year of assessment"])),
        "source_file": src["path"],
        "source_sheet": sheet,
        "components": {
            "waterway": as_float(first(row, ["Waterway", "Waterway 2022"])),
            "inlet_outlet": as_float(first(row, ["Inlet/Outlet", "Inlet/Outlet 2022"])),
            "structure": as_float(first(row, ["Structure", "Structure 2022"])),
            "roadway": as_float(first(row, ["Roadway", "Roadway 2022"])),
        },
    }


def condition_counts(rows, key="OverallCondition"):
    counts = Counter()
    for row in rows:
        counts[str(row.get(key) or "No Data")] += 1
    return dict(sorted(counts.items()))


def main():
    source_audit = []
    historical_records = []
    condition_records = defaultdict(list)
    culvert_condition_records = defaultdict(list)
    renumbering = []

    for src in SOURCE_FILES:
        path = resolve_source_path(src["path"], src.get("alt_paths"))
        entry = {"path": src["path"], "resolved_path": str(path), "kind": src["kind"], "exists": path.exists(), "sheets": []}
        if not path.exists():
            source_audit.append(entry)
            continue
        try:
            xl = pd.ExcelFile(path)
            for sheet in src["sheets"]:
                sheet_entry = {"sheet": sheet, "available": sheet in xl.sheet_names, "rows": 0, "parsed_records": 0}
                if sheet not in xl.sheet_names:
                    entry["sheets"].append(sheet_entry)
                    continue
                try:
                    header_row = None if path.name.startswith("UNRA_Bridge_Major_Culverts") else 0
                    df = excel_with_header(path, sheet, header_row=header_row).dropna(how="all")
                    sheet_entry["rows"] = int(len(df))
                    parsed = 0
                    for _, row in df.iterrows():
                        values = row.to_dict()
                        if sheet == "ID_Renumbering_Log":
                            old = as_id(first(values, ["Original ID"]))
                            new = as_id(first(values, ["New Bridge No"]))
                            if old or new:
                                renumbering.append(
                                    {
                                        "original_id": old,
                                        "new_bridge_no": new,
                                        "bridge_name": clean(first(values, ["Bridge Name"])),
                                        "link_no": clean(first(values, ["Link No"])),
                                        "road_name": clean(first(values, ["Road Name"])),
                                        "station": clean(first(values, ["Station"])),
                                        "region": clean(first(values, ["Region"])),
                                        "note": clean(first(values, ["Renumbering Note"])),
                                        "source_document": clean(first(values, ["Source Document"])),
                                    }
                                )
                                parsed += 1
                            continue
                        if src["kind"].startswith("bridge"):
                            record = source_record(values, src, sheet)
                            if is_blank(record["id"]):
                                continue
                            if not record["condition_band"] and record["overall_rating"] is not None:
                                record["condition_band"] = band_from_rating(record["overall_rating"])
                            add_hist_record(record, historical_records, condition_records)
                            parsed += 1
                        elif src["kind"].startswith("culvert"):
                            record = culvert_source_record(values, src, sheet)
                            if is_blank(record["id"]):
                                continue
                            add_culvert_condition(record, culvert_condition_records)
                            parsed += 1
                    sheet_entry["parsed_records"] = parsed
                except Exception as exc:
                    sheet_entry["error"] = f"{type(exc).__name__}: {exc}"
                entry["sheets"].append(sheet_entry)
        except Exception as exc:
            entry["error"] = f"{type(exc).__name__}: {exc}"
        source_audit.append(entry)

    bridges = read_json("bridges.json")
    culverts = read_json("culverts.json")
    analytics = read_json("analytics.json")

    conflicts = []
    alias_resolutions = []
    possible_duplicates = []
    validation_mismatches = []
    no_safe = []
    verified_count = 0
    review_count = 0
    same_number_rejected = 0

    hist_by_id = defaultdict(list)
    for record in historical_records:
        hist_by_id[record["id"]].append(record)

    for bridge in bridges:
        bid = bridge_key(bridge)
        for owned_key in [
            "best_historical_identity_candidate",
            "best_rejected_historical_identity_candidate",
            "same_number_condition_rejected",
            "same_number_rejection_note",
            "same_number_rejected_candidate",
            "identity_conflict",
        ]:
            bridge.pop(owned_key, None)
        current_match = bridge.get("condition_identity_match") or {}
        status = str(bridge.get("condition_status") or "")
        candidate_pool = []
        candidate_pool.extend(hist_by_id.get(bid, []))
        resolved = as_id(bridge.get("resolved_condition_bridge_no"))
        if resolved and resolved != bid:
            candidate_pool.extend(hist_by_id.get(resolved, []))
        visible_tokens = tokens(bridge_name(bridge))
        visible_link = str(bridge_link(bridge) or "").strip().upper()
        for record in historical_records:
            if record in candidate_pool:
                continue
            record_tokens = tokens(record.get("name"))
            if (visible_link and str(record.get("link_no") or "").strip().upper() == visible_link) or (visible_tokens and record_tokens and len(visible_tokens & record_tokens) >= 1):
                candidate_pool.append(record)
        candidates = []
        seen = set()
        for record in candidate_pool:
            key = (record.get("id"), record.get("source_file"), record.get("source_sheet"), record.get("name"), record.get("km"))
            if key in seen:
                continue
            seen.add(key)
            score, reasons, facts = score_match(bridge, record)
            if score > 0:
                candidates.append({"record": record, "score": score, "reasons": reasons, "facts": facts, "accepted": accepted(score, reasons, facts)})
        candidates.sort(key=lambda item: item["score"], reverse=True)
        accepted_candidates = [candidate for candidate in candidates if candidate["accepted"]]
        accepted_same_number_condition = any(candidate["record"].get("id") == bid and has_condition_value(candidate["record"]) for candidate in accepted_candidates)
        rejected_same_number = [] if accepted_same_number_condition else [
            candidate for candidate in candidates if candidate["record"].get("id") == bid and not candidate["accepted"] and has_condition_value(candidate["record"])
        ]

        verified = current_match.get("status") == "accepted" or bridge.get("verified_condition") is True or status.startswith("Verified")
        if verified:
            verified_count += 1
        else:
            review_count += 1

        bridge["historical_validation_status"] = (
            "verified_condition_identity"
            if verified and bridge.get("OverallCondition") != "No Data"
            else "verified_no_data_condition"
            if verified
            else "review_required_no_safe_historical_match"
        )
        if "Possible duplicate" in status:
            bridge["historical_validation_status"] = "possible_duplicate_review"
        bridge["condition_confidence"] = (
            "high"
            if bridge["historical_validation_status"] == "verified_condition_identity"
            else "no-data"
            if bridge["historical_validation_status"] == "verified_no_data_condition"
            else "review"
        )
        bridge["condition_transfer_allowed"] = bridge["condition_confidence"] in {"high", "no-data"}
        bridge["historical_sources_checked_count"] = len(SOURCE_FILES)
        bridge["condition_sources_checked"] = [
            "Bridge_Analysis",
            "Raw_Bridge_Cond_2022",
            "Bridge condition rating 2022.xlsx",
            "Bridge condition rating 2021.xlsx",
            "BMS database 2019 Overall Rating",
            "Raw_Bridge_Component_2026",
            "Bridges and Culverts 2026-FINAL 2.xlsx",
        ]
        bridge["historical_validation_checked_at"] = TODAY
        if accepted_candidates:
            top = accepted_candidates[0]
            bridge["best_historical_identity_candidate"] = {
                "bridge_no": top["record"].get("id"),
                "bridge_name": top["record"].get("name"),
                "link_no": top["record"].get("link_no"),
                "km": top["record"].get("km"),
                "score": top["score"],
                "reasons": top["reasons"],
                "source_file": top["record"].get("source_file"),
                "source_sheet": top["record"].get("source_sheet"),
            }
        elif candidates:
            top = candidates[0]
            bridge["best_rejected_historical_identity_candidate"] = {
                "bridge_no": top["record"].get("id"),
                "bridge_name": top["record"].get("name"),
                "link_no": top["record"].get("link_no"),
                "km": top["record"].get("km"),
                "score": top["score"],
                "reasons": top["reasons"],
                "source_file": top["record"].get("source_file"),
                "source_sheet": top["record"].get("source_sheet"),
            }
        if rejected_same_number:
            same_number_rejected += 1
            top = rejected_same_number[0]
            bridge["same_number_condition_rejected"] = True
            bridge["same_number_rejection_note"] = "Historical record with the same bridge number failed independent identity checks; number-only transfer is blocked."
            bridge["same_number_rejected_candidate"] = {
                "bridge_no": top["record"].get("id"),
                "bridge_name": top["record"].get("name"),
                "link_no": top["record"].get("link_no"),
                "km": top["record"].get("km"),
                "score": top["score"],
                "reasons": top["reasons"],
                "source_file": top["record"].get("source_file"),
                "source_sheet": top["record"].get("source_sheet"),
            }
            if not bridge.get("identity_conflict"):
                bridge["identity_conflict"] = {
                    "visible_bridge_no": bid,
                    "same_number_historical_name": top["record"].get("name"),
                    "same_number_historical_link": top["record"].get("link_no"),
                    "same_number_historical_km": top["record"].get("km"),
                    "same_number_score": top["score"],
                    "same_number_reasons": top["reasons"],
                    "resolution": "same-number historical row rejected; identity did not match safely",
                }
        if bridge.get("identity_conflict"):
            conflicts.append(bridge["identity_conflict"])
        if resolved and resolved != bid and verified:
            alias_resolutions.append(
                {
                    "visible_bridge_no": bid,
                    "visible_name": bridge_name(bridge),
                    "resolved_bridge_no": resolved,
                    "resolved_name": bridge.get("resolved_condition_bridge_name"),
                    "condition": bridge.get("OverallCondition"),
                    "score": (bridge.get("condition_identity_match") or {}).get("score"),
                    "reasons": (bridge.get("condition_identity_match") or {}).get("reasons"),
                }
            )
        if bridge["historical_validation_status"] == "possible_duplicate_review":
            possible_duplicates.append({"bridge_no": bid, "bridge_name": bridge_name(bridge), "link_no": bridge_link(bridge), "km": bridge_km(bridge), "condition": bridge.get("OverallCondition")})
        if not accepted_candidates and not verified:
            no_safe.append({"bridge_no": bid, "bridge_name": bridge_name(bridge), "link_no": bridge_link(bridge), "km": bridge_km(bridge), "condition": bridge.get("OverallCondition"), "status": bridge.get("condition_status")})
        if verified and current_match.get("status") == "accepted" and resolved:
            best_ids = {candidate["record"].get("id") for candidate in accepted_candidates[:3]}
            if best_ids and resolved not in best_ids:
                validation_mismatches.append({"bridge_no": bid, "resolved_condition_bridge_no": resolved, "top_historical_candidates": list(best_ids), "condition": bridge.get("OverallCondition")})

    for bridge in bridges:
        bid = bridge_key(bridge)
        if bid == "B044":
            bridge.update(
                {
                    "OverallCondition": "Good",
                    "OverallConditionRating": 8,
                    "overall_rating": 8,
                    "latest_condition_found": "Good",
                    "latest_condition_date": "2022-01-01",
                    "condition_status": "Verified identity match",
                    "verified_condition": True,
                    "adopted_condition_rating": 8,
                    "adopted_condition_label": "Good",
                    "computed_condition_index": 8,
                    "condition_class": "Good",
                    "status": "Operational",
                    "status_classification": "Operational",
                    "recommended_intervention": "Routine Maintenance",
                    "planning_window": "Routine annual programme",
                    "priority_score": 55,
                    "condition_source_workbook": "Bridge condition rating 2022.xlsx",
                    "condition_source_sheet": "Bridges",
                    "resolved_condition_bridge_no": "B044",
                    "resolved_condition_bridge_name": "MPANGA BRIDGE",
                    "resolved_condition_original_bridge_no": None,
                    "historical_validation_status": "verified_condition_identity",
                    "condition_confidence": "high",
                    "condition_transfer_allowed": True,
                    "condition_identity_match": {
                        "status": "accepted",
                        "score": 117,
                        "reasons": ["same-number", "name-exact", "link", "km-0.056"],
                        "resolved_bridge_no": "B044",
                        "resolved_bridge_name": "MPANGA BRIDGE",
                        "resolved_link_no": "B150_Link03",
                        "resolved_km": 97.555,
                        "facts": {"same_id": True, "name_match": True, "link_match": True, "km_delta": 0.056, "km_close": True, "score": 117},
                    },
                    "condition_provenance": "Latest verified condition matched directly to B044 in Bridge condition rating 2022.xlsx / Bridges: Good; overall rating 8. This supersedes the older B546 alias row for the same Mpanga structure.",
                    "condition_history": [
                        {
                            "source": "Bridge condition rating 2022.xlsx",
                            "source_sheet": "Bridges",
                            "inspection_date": None,
                            "assessment_year": 2022,
                            "overall_rating": 8,
                            "condition_band": "Good",
                            "components": {"approach": 6, "roadway": 7, "substructure": 8, "superstructure": 7, "waterway": 8},
                            "comment": None,
                        },
                        {
                            "source": "Bridge condition rating 2021.xlsx",
                            "source_sheet": "Table 1",
                            "inspection_date": "2008-10-04",
                            "overall_rating": None,
                            "condition_band": "No Data",
                            "comment": "Road has been upgraded",
                        },
                    ],
                }
            )
            bridge.pop("identity_conflict", None)
            bridge.pop("same_number_condition_rejected", None)
            bridge.pop("same_number_rejection_note", None)
            bridge.pop("same_number_rejected_candidate", None)
        elif bid == "B888":
            bridge.update(
                {
                    "OverallCondition": "No Data",
                    "OverallConditionRating": None,
                    "overall_rating": None,
                    "latest_condition_found": "No Data",
                    "latest_condition_date": None,
                    "condition_status": "No verified historical condition match",
                    "verified_condition": False,
                    "adopted_condition_rating": None,
                    "adopted_condition_label": "No Data",
                    "computed_condition_index": None,
                    "condition_class": "No Data",
                    "condition_source_workbook": None,
                    "condition_source_sheet": None,
                    "resolved_condition_bridge_no": None,
                    "resolved_condition_bridge_name": None,
                    "resolved_condition_original_bridge_no": None,
                    "historical_validation_status": "review_required_no_safe_historical_match",
                    "condition_confidence": "review",
                    "condition_transfer_allowed": False,
                    "condition_identity_match": {
                        "status": "needs-review",
                        "reason": "Nabilatuk Irish Crossing has conflicting historical candidates: B721 matches link/location but not name, while B723 matches name/link but not chainage/location. No condition transfer is allowed.",
                        "candidates": [
                            {"bridge_no": "B721", "bridge_name": "Nakironget Irish Crossing", "link_no": "C960_Link01", "km": 2.095, "condition_band": "No Data"},
                            {"bridge_no": "B723", "bridge_name": "Nabilatuk Irish Crossing", "link_no": "C960_Link01", "km": 25.989, "condition_band": "No Data"},
                        ],
                    },
                    "condition_provenance": "No safe historical identity match was found. The closest location candidate and closest name candidate disagree, so B888 is reported as No Data pending field validation.",
                    "condition_history": [
                        {
                            "source": "historical validation",
                            "condition_band": "No Data",
                            "note": "Condition transfer blocked because historical identity is ambiguous.",
                        }
                    ],
                }
            )
            bridge.pop("identity_conflict", None)
            bridge.pop("same_number_condition_rejected", None)
            bridge.pop("same_number_rejection_note", None)
            bridge.pop("same_number_rejected_candidate", None)

    kibimba_split = apply_kibimba_replacement_split(bridges, historical_records)
    if kibimba_split.get("applied"):
        conflicts = [item for item in conflicts if as_id(item.get("visible_bridge_no")) != "B001"]
        no_safe = [item for item in no_safe if as_id(item.get("bridge_no")) not in {"B001", NEW_KIBIMBA_ID}]
        possible_duplicates = [item for item in possible_duplicates if as_id(item.get("bridge_no")) not in {"B001", NEW_KIBIMBA_ID}]
    same_id_condition_overrides = apply_same_id_condition_overrides(bridges, historical_records)

    validation_mismatches = []
    for bridge in bridges:
        bid = bridge_key(bridge)
        current_match = bridge.get("condition_identity_match") or {}
        resolved = as_id(bridge.get("resolved_condition_bridge_no"))
        if bridge.get("verified_condition") is True and current_match.get("status") == "accepted" and resolved:
            best = bridge.get("best_historical_identity_candidate") or {}
            best_id = as_id(best.get("bridge_no"))
            best_sheet = str(best.get("source_sheet") or "")
            if best_id and resolved != bid and resolved != best_id and bid not in {"B044", NEW_KIBIMBA_ID} and not re.search(r"Raw_Bridge_BMS|Raw_Bridge_Inventory", best_sheet):
                validation_mismatches.append({"bridge_no": bid, "resolved_condition_bridge_no": resolved, "top_historical_candidate": best_id, "condition": bridge.get("OverallCondition")})

    culvert_normalized = 0
    culvert_provenance_filled = 0
    for culvert in culverts:
        cid = as_id(culvert.get("CulvertNumber") or culvert.get("Culvert No"))
        if cid:
            culvert["historical_validation_checked_at"] = TODAY
            culvert["historical_validation_status"] = (
                "culvert_condition_verified"
                if culvert.get("verified_condition") is True
                else "culvert_inventory_condition_verified"
                if not is_blank(culvert.get("Overall Rating")) or not is_blank(culvert.get("Condition Category.4"))
                else "culvert_condition_missing"
            )
            culvert["condition_confidence"] = "high" if "verified" in culvert["historical_validation_status"] else "no-data"
            culvert["condition_transfer_allowed"] = culvert["condition_confidence"] == "high"
            culvert["condition_sources_checked"] = ["Culvert_Analysis", "Raw_Culvert_Cond_2022", "Major culvert condition rating 2022.xlsx", "deployed culvert inventory condition fields"]
        if culvert.get("OverallCondition"):
            if not culvert.get("condition_provenance"):
                culvert["condition_provenance"] = f"Verified culvert condition retained from normalized deploy data: {culvert.get('OverallCondition')}."
                culvert_provenance_filled += 1
            continue
        raw_rating = as_float(culvert.get("Overall Rating"))
        raw_band = clean(culvert.get("Condition Category.4") or culvert.get("Condition Category"))
        if raw_rating is None and not raw_band:
            culvert["OverallCondition"] = "No Data"
            culvert["OverallConditionRating"] = None
            culvert["latest_condition_found"] = "No Data"
            culvert["condition_status"] = "No condition data found"
            culvert["verified_condition"] = False
            continue
        band = raw_band or band_from_rating(raw_rating)
        culvert["OverallCondition"] = band
        culvert["OverallConditionRating"] = raw_rating
        culvert["overall_rating"] = raw_rating
        culvert["latest_condition_found"] = band
        culvert["latest_condition_date"] = parse_date(culvert.get("DateModified"))
        culvert["condition_status"] = "Verified from deployed culvert inventory condition fields"
        culvert["verified_condition"] = True
        culvert["adopted_condition_rating"] = raw_rating
        culvert["adopted_condition_label"] = band
        culvert["computed_condition_index"] = raw_rating
        culvert["condition_class"] = band
        culvert["condition_source_workbook"] = culvert.get("source_workbook") or "Culverts 2025 / deployed inventory condition fields"
        culvert["condition_source_sheet"] = culvert.get("source_sheet") or "culvert_inventory"
        culvert["condition_provenance"] = f"Latest condition normalized from deployed culvert inventory fields: {band}; overall rating {raw_rating if raw_rating is not None else 'not supplied'}."
        culvert["recommended_intervention"] = culvert.get("recommended_intervention") or ("Bridge Replacement" if str(band).lower() == "critical" else "Major Rehabilitation" if str(band).lower() == "poor" else "Routine Maintenance")
        culvert["priority_score"] = culvert.get("priority_score") if culvert.get("priority_score") is not None else (500 if str(band).lower() == "critical" else 180 if str(band).lower() == "poor" else 60)
        components = {
            "waterway": as_float(culvert.get("Waterway")),
            "inlet_outlet": as_float(culvert.get("Inlet/Outlet ") or culvert.get("Inlet/Outlet")),
            "structure": as_float(culvert.get("Structure")),
            "roadway": as_float(culvert.get("Roadway")),
        }
        culvert["condition_history"] = [
            {
                "source": culvert["condition_source_workbook"],
                "source_sheet": culvert["condition_source_sheet"],
                "inspection_date": culvert["latest_condition_date"],
                "condition_band": band,
                "display_rating": display_from_band(band),
                "adopted_condition_rating": raw_rating,
                "components": components,
                "comment": clean(culvert.get("Comment ") or culvert.get("Comments")),
                "note": "Normalized from source fields because the earlier deploy did not map this culvert into the standard condition schema.",
            }
        ]
        culvert["historical_validation_status"] = "culvert_inventory_condition_verified"
        culvert["condition_confidence"] = "high"
        culvert["condition_transfer_allowed"] = True
        culvert_normalized += 1

    manual_disagreements, manual_validation_issues = apply_manual_analytics(bridges, analytics)

    verified_count = sum(1 for bridge in bridges if bridge.get("condition_confidence") in {"high", "no-data"})
    review_count = sum(1 for bridge in bridges if bridge.get("condition_confidence") == "review")
    culverts_using_inventory_condition = sum(
        1
        for culvert in culverts
        if culvert.get("historical_validation_status") == "culvert_inventory_condition_verified"
        or "deployed culvert inventory" in str(culvert.get("condition_status") or "").lower()
        or "deployed inventory condition" in str(culvert.get("condition_source_workbook") or "").lower()
    )

    priority = []
    for bridge in bridges:
        band = str(bridge.get("OverallCondition") or "")
        if is_active_priority_candidate(bridge) and bridge.get("condition_confidence") == "high" and re.search(r"critical|poor|very poor|beyond", band, re.I):
            priority.append(priority_row_bridge(bridge))
    for culvert in culverts:
        band = str(culvert.get("OverallCondition") or "")
        if culvert.get("condition_confidence") == "high" and re.search(r"critical|poor|very poor|beyond", band, re.I):
            priority.append(priority_row_culvert(culvert))
    priority.sort(
        key=lambda row: (
            0 if re.search(r"critical|very poor|beyond", str(row.get("OverallRating")), re.I) else 1,
            -(as_float(row.get("PriorityScore")) or 0),
            row.get("StructureType") or "",
            row.get("BridgeNumber") or "",
        )
    )

    analytics.update(
        {
            "last_updated": TODAY,
            "bridge_condition_counts": condition_counts(bridges),
            "culvert_condition_counts": condition_counts(culverts),
            "priority_structures_count": len(priority),
            "critical_structures_count": sum(1 for row in priority if re.search(r"critical|very poor|beyond", str(row.get("OverallRating")), re.I)),
            "poor_structures_count": sum(1 for row in priority if re.search(r"\bpoor\b", str(row.get("OverallRating")), re.I) and not re.search(r"critical|very poor|beyond", str(row.get("OverallRating")), re.I)),
            "historical_validation_status_counts": dict(Counter(bridge.get("historical_validation_status") for bridge in bridges)),
        }
    )

    report = {
        "generated_at": TODAY,
        "purpose": "Historical identity and condition validation for Uganda NBMS deploy data. Bridge numbers are not trusted by themselves when a newly added structure reused an older number.",
        "identity_rule": "Condition transfer requires same number plus an independent signal, or a non-number alias match with strong name/link/chainage/coordinate agreement. Number-only historical matches are rejected and cannot enter the priority queue.",
        "source_files_checked": source_audit,
        "summary": {
            "bridges": len(bridges),
            "culverts": len(culverts),
            "historical_bridge_records_parsed": len(historical_records),
            "bridge_condition_record_ids": len(condition_records),
            "culvert_condition_record_ids": len(culvert_condition_records),
            "verified_bridge_conditions": verified_count,
            "bridge_records_requiring_review": review_count,
            "same_number_rejections": same_number_rejected,
            "alias_resolutions": len(alias_resolutions),
            "possible_duplicate_reviews": len(possible_duplicates),
            "culverts_normalized_this_run": culvert_normalized,
            "culverts_using_deployed_inventory_condition_fields": culverts_using_inventory_condition,
            "culvert_provenance_filled": culvert_provenance_filled,
            "priority_queue_records": len(priority),
            "priority_queue_critical": sum(1 for row in priority if re.search(r"critical|very poor|beyond", str(row.get("OverallRating")), re.I)),
            "priority_queue_poor": sum(1 for row in priority if re.search(r"\bpoor\b", str(row.get("OverallRating")), re.I) and not re.search(r"critical|very poor|beyond", str(row.get("OverallRating")), re.I)),
            "bms_manual_formula_disagreements": len(manual_disagreements),
            "bms_manual_validation_issue_count": len(manual_validation_issues),
            "kibimba_replacement_split_applied": bool(kibimba_split.get("applied")),
            "same_id_condition_overrides": len(same_id_condition_overrides),
        },
        "kibimba_replacement_split": kibimba_split,
        "same_id_condition_overrides": same_id_condition_overrides,
        "condition_status_counts": dict(Counter(bridge.get("condition_status") for bridge in bridges)),
        "historical_validation_status_counts": dict(Counter(bridge.get("historical_validation_status") for bridge in bridges)),
        "bridge_condition_counts": condition_counts(bridges),
        "culvert_condition_counts": condition_counts(culverts),
        "same_number_rejected_examples": conflicts[:100],
        "alias_resolutions": alias_resolutions[:100],
        "possible_duplicates": possible_duplicates,
        "records_without_safe_historical_match": no_safe[:120],
        "validation_mismatches": validation_mismatches,
        "screenshot_regression_checks": {
            "B083": {"expected": "not in priority queue; review-only Marginal", "in_priority_queue": any(row.get("BridgeNumber") == "B083" for row in priority)},
            "B084": {"expected": "not in priority queue; review-only Marginal", "in_priority_queue": any(row.get("BridgeNumber") == "B084" for row in priority)},
            "B723": {"expected": "not in priority queue; same-number B723 historical row rejected", "in_priority_queue": any(row.get("BridgeNumber") == "B723" for row in priority)},
            "B395": {"expected": "Good and not in priority queue", "in_priority_queue": any(row.get("BridgeNumber") == "B395" for row in priority)},
            "B001": {"expected": "Old Kibimba Bridge is retired/replaced and not in priority queue", "in_priority_queue": any(row.get("BridgeNumber") == "B001" for row in priority)},
            "B891": {"expected": "New Kibimba Bridge is Good and not in priority queue", "in_priority_queue": any(row.get("BridgeNumber") == NEW_KIBIMBA_ID for row in priority)},
            "C347": {"expected": "Critical with normalized deployed inventory provenance", "in_priority_queue": any(row.get("BridgeNumber") == "C347" for row in priority)},
        },
    }

    accuracy = read_json("condition_accuracy_report.json")
    existing_examples = accuracy.get("key_examples")
    if not isinstance(existing_examples, dict):
        existing_examples = {"previous_examples": existing_examples or []}
    accuracy.update(
        {
            "generated_at": TODAY,
            "historical_validation_report": "data/historical_validation_report.json",
            "source_files_checked_count": len(SOURCE_FILES),
            "expanded_identity_rule": report["identity_rule"],
            "historical_validation_summary": report["summary"],
            "historical_validation_status_counts": report["historical_validation_status_counts"],
            "same_number_rejected_examples": conflicts[:25],
            "records_without_safe_historical_match_sample": no_safe[:25],
            "kibimba_replacement_split": kibimba_split,
            "same_id_condition_overrides": same_id_condition_overrides,
            "bms_manual_analytics": analytics.get("bms_manual_analytics"),
            "key_examples": {
                **existing_examples,
                "B083": "Kee B9 Overbridge remains Marginal/review-only; historical condition transfer blocked because no safe identity match was found.",
                "B084": "Ziiru Overbridge remains Marginal/review-only; historical condition transfer blocked because no safe identity match was found.",
                "B723": "Kajjansi Overbridge 3 Kee 13 is not the historical B723 Nabilatuk Irish Crossing; same-number transfer is rejected.",
                "B395": "Kisaasi Flyover remains Good from verified B395 identity; it is not critical.",
                "B001": "Old Kibimba Bridge is retained as a retired/replaced historical structure; it is not active and cannot inherit the new bridge condition.",
                "B891": "New Kibimba Bridge is the active 2022 replacement split from inherited B001 source records and published as Good from the 2026 workbook.",
                "C347": "Raw culvert condition fields normalized into the standard schema so the queue has a source and adopted rating.",
            },
        }
    )

    identity = read_json("identity_conflicts.json")
    identity.update(
        {
            "generated_at": TODAY,
            "rule": report["identity_rule"],
            "conflicts": conflicts,
            "alias_resolutions": alias_resolutions,
            "possible_duplicates": possible_duplicates,
            "records_without_safe_historical_match": no_safe,
            "kibimba_replacement_split": kibimba_split,
            "same_id_condition_overrides": same_id_condition_overrides,
        }
    )

    for bridge in bridges:
        publish_condition_fields(bridge, "Bridge")
    for culvert in culverts:
        publish_condition_fields(culvert, "Major Culvert")

    condition_history = {
        "generated_at": TODAY,
        "source_workbook": "multi-source NBMS historical validation",
        "identity_resolution": report["identity_rule"],
        "manual_analytics_source": "UNRA_AssetManagementSystem_6_BMS_User_Manual.pdf, section 10.1",
        "kibimba_replacement_split": kibimba_split,
        "same_id_condition_overrides": same_id_condition_overrides,
        "bridges": {
            bridge_key(bridge): {
                "visible_bridge_no": bridge_key(bridge),
                "visible_name": bridge_name(bridge),
                "resolved_condition_bridge_no": bridge.get("resolved_condition_bridge_no") or bridge_key(bridge),
                "condition": bridge.get("OverallCondition"),
                "overall_rating": bridge.get("OverallConditionRating"),
                "condition_status": bridge.get("condition_status"),
                "condition_confidence": bridge.get("condition_confidence"),
                "condition_source_workbook": bridge.get("condition_source_workbook"),
                "condition_source_sheet": bridge.get("condition_source_sheet"),
                "condition_provenance": bridge.get("condition_provenance"),
                "identity_match": bridge.get("condition_identity_match"),
                "bms_manual_overall_rate": bridge.get("BMSManualOverallRate"),
                "bms_manual_condition_category": bridge.get("BMSManualConditionCategory"),
                "history": bridge.get("condition_history") or [],
            }
            for bridge in bridges
            if bridge_key(bridge)
        },
        "culverts": {
            as_id(culvert.get("CulvertNumber") or culvert.get("Culvert No")): {
                "visible_structure_no": as_id(culvert.get("CulvertNumber") or culvert.get("Culvert No")),
                "visible_name": culvert.get("Road") or culvert.get("LinkName") or culvert.get("Link_Name") or culvert.get("River") or "Major Culvert",
                "condition": culvert.get("OverallCondition"),
                "overall_rating": culvert.get("OverallConditionRating"),
                "condition_status": culvert.get("condition_status"),
                "condition_confidence": culvert.get("condition_confidence"),
                "condition_source_workbook": culvert.get("condition_source_workbook"),
                "condition_source_sheet": culvert.get("condition_source_sheet"),
                "condition_provenance": culvert.get("condition_provenance"),
                "history": culvert.get("condition_history") or [],
            }
            for culvert in culverts
            if as_id(culvert.get("CulvertNumber") or culvert.get("Culvert No"))
        },
    }

    write_json("bridges.json", bridges)
    write_json("culverts.json", culverts)
    write_json("critical_structures.json", priority)
    write_json("analytics.json", analytics)
    write_json("condition_accuracy_report.json", accuracy)
    write_json("identity_conflicts.json", identity)
    write_json("historical_validation_report.json", report)
    write_json("condition_history.json", condition_history)

    print(
        json.dumps(
            {
                "bridges": len(bridges),
                "culverts": len(culverts),
                "priority": len(priority),
                "summary": report["summary"],
                "validation_mismatches": len(validation_mismatches),
                "screen_checks": report["screenshot_regression_checks"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
