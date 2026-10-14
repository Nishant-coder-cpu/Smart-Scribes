import llm_provider
import UploadTOFrontend


def test_safe_json_handles_wrapped_and_empty_output():
    assert llm_provider.safe_json('Sure! {"a": 1} hope that helps') == {"a": 1}
    assert llm_provider.safe_json('["x", "y"]') == ["x", "y"]
    assert llm_provider.safe_json(None) == {}
    assert llm_provider.safe_json("no json here") == {}


def test_bedrock_tiers_use_configured_model(monkeypatch):
    seen = {}

    def fake_generate(prompt, **kwargs):
        seen.update(kwargs)
        return "ok"

    monkeypatch.setattr(llm_provider, "generate", fake_generate)
    monkeypatch.delenv("BEDROCK_MODEL_FAST", raising=False)
    monkeypatch.setenv("BEDROCK_MODEL_ID", "openai.gpt-oss-20b-1:0")
    llm_provider.generate_fast("hi", provider="aws")
    assert seen["model"] == "openai.gpt-oss-20b-1:0"


def test_prepare_record_keeps_only_table_columns():
    record = {
        "id": "ic112-l1",
        "lecture_id": "ic112-l1",
        "topic": "QuickSort",
        "content_data": [],
        "meta": {"segments": 3},
    }
    prepared = UploadTOFrontend.prepare_record(record)
    assert "meta" not in prepared
    assert prepared["topic"] == "QuickSort"
    assert "updated_at" in prepared
