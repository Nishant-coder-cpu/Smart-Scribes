import config
import worker


def test_make_lecture_id_matches_web_app_format():
    assert config.make_lecture_id("ic-112", "1-1761663067632") == "ic112-l1"
    assert config.make_lecture_id("ic-112", "3") == "ic112-l3"


def test_lecture_number_from_folder():
    assert config.lecture_number_from_folder("19-1761641030325") == 19
    assert config.lecture_number_from_folder("unlabeled") is None


def test_task_from_media_url_keeps_real_course_id():
    url = "https://storage.googleapis.com/smart-scribes/courses/ic-112/lectures/4/audio.mp3"
    assert worker.task_from_media_url(url, "ic112-l4") == ["ic-112", "4"]


def test_task_from_media_url_falls_back_to_lecture_id():
    assert worker.task_from_media_url(None, "ic112-l7") == ["ic112", "7"]


class _FakeQuery:
    def __init__(self, rows):
        self.rows = rows
        self.filters = []
        self.payload = None

    def update(self, payload):
        self.payload = payload
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def execute(self):
        return type("Resp", (), {"data": self.rows})()


class _FakeSupabase:
    def __init__(self, rows):
        self.query = _FakeQuery(rows)

    def table(self, name):
        assert name == "lectures_processing"
        return self.query


def test_claim_job_only_matches_pending_rows():
    client = _FakeSupabase(rows=[{"id": "proc_1"}])
    assert worker.claim_job(client, {"id": "proc_1", "attempts": 2}) is True
    assert ("status", "pending") in client.query.filters
    assert client.query.payload["status"] == "processing"
    assert client.query.payload["attempts"] == 3


def test_claim_job_reports_lost_race():
    client = _FakeSupabase(rows=[])
    assert worker.claim_job(client, {"id": "proc_1"}) is False
