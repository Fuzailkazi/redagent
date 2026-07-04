"""Library loader validation + scorer weighting tests."""

import pytest

import redteam
from conftest import LIBRARY_PATH


def test_real_library_loads_and_covers_categories():
    lib = redteam.load_library(LIBRARY_PATH)
    assert lib["version"] == "0.1.0"
    assert len(lib["probes"]) == 13
    cats = {p["category"] for p in lib["probes"]}
    assert cats == set(redteam.VALID_CATEGORIES)  # 10/10 covered
    ids = [p["id"] for p in lib["probes"]]
    assert len(ids) == len(set(ids))  # unique ids


def test_loader_rejects_duplicate_ids():
    bad = {"version": "0.1.0", "probes": [
        {"id": "a", "category": "prompt_injection", "owasp": "AAI01",
         "severity": "low", "prompt": "x",
         "detection": {"tier1": {"mode": "regex", "failIfMatches": [],
                                 "passIfMatches": []}}},
        {"id": "a", "category": "tool_misuse", "owasp": "AAI02",
         "severity": "low", "prompt": "x",
         "detection": {"tier1": {"mode": "regex", "failIfMatches": [],
                                 "passIfMatches": []}}},
    ]}
    with pytest.raises(redteam.RedteamError, match="duplicate probe id"):
        redteam.validate_library(bad)


def test_loader_rejects_bad_regex():
    bad = {"version": "0.1.0", "probes": [
        {"id": "a", "category": "prompt_injection", "owasp": "AAI01",
         "severity": "low", "prompt": "x",
         "detection": {"tier1": {"mode": "regex", "failIfMatches": ["("],
                                 "passIfMatches": []}}},
    ]}
    with pytest.raises(redteam.RedteamError, match="bad regex"):
        redteam.validate_library(bad)


def test_loader_rejects_invalid_severity():
    bad = {"version": "0.1.0", "probes": [
        {"id": "a", "category": "prompt_injection", "owasp": "AAI01",
         "severity": "extreme", "prompt": "x",
         "detection": {"tier1": {"mode": "regex", "failIfMatches": [],
                                 "passIfMatches": []}}},
    ]}
    with pytest.raises(redteam.RedteamError, match="invalid severity"):
        redteam.validate_library(bad)


def _r(verdict, severity):
    return {"id": "x", "category": "prompt_injection", "owasp": "AAI01",
            "severity": severity, "verdict": verdict}


def test_scorer_weighted_risk_math():
    # 1 critical FAIL (w4), 1 low PASS (w1) -> weightedTotal 5, weightedFail 4.
    results = [_r(redteam.FAIL, "critical"), _r(redteam.PASS, "low")]
    s = redteam.score(results)
    assert s["resiliencePct"] == 50.0
    assert s["weightedRiskPct"] == 80.0  # 4/5
    assert s["weightedFail"] == 4
    assert s["weightedTotal"] == 5


def test_scorer_inconclusive_and_error_not_pass():
    results = [_r(redteam.INCONCLUSIVE, "high"), _r(redteam.ERROR, "high")]
    s = redteam.score(results)
    assert s["resiliencePct"] == 0.0
    assert s["weightedRiskPct"] == 0.0  # no FAILs
    assert s["counts"][redteam.PASS] == 0
