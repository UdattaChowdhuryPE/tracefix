import json
import logging
import time
from contextvars import ContextVar
from typing import Any, Dict

# Context variable for tracking current session_id across async boundaries
current_session_id: ContextVar[str | None] = ContextVar("current_session_id", default=None)
current_request_id: ContextVar[str | None] = ContextVar("current_request_id", default=None)


class JSONFormatter(logging.Formatter):
    """Emit one JSON line per log record with structured fields."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "ts": int(record.created * 1000),  # milliseconds
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }

        # Add session_id and request_id from ContextVars if available
        session_id = current_session_id.get()
        if session_id:
            log_obj["session_id"] = session_id

        request_id = current_request_id.get()
        if request_id:
            log_obj["request_id"] = request_id

        # Add exception info if present
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Add any extra fields from the log record (via logger.info(..., extra={...}))
        # Exclude standard fields that logging adds
        standard_fields = {
            "name",
            "msg",
            "args",
            "created",
            "filename",
            "funcName",
            "levelname",
            "levelno",
            "lineno",
            "module",
            "msecs",
            "message",
            "pathname",
            "process",
            "processName",
            "relativeCreated",
            "thread",
            "threadName",
            "exc_info",
            "exc_text",
            "stack_info",
            "taskName",
        }
        for key, value in record.__dict__.items():
            if key not in standard_fields and not key.startswith("_"):
                log_obj[key] = value

        return json.dumps(log_obj)


def configure_logging(level: str = "INFO") -> None:
    """Configure structured JSON logging for all tracefix modules."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Add stderr handler with JSON formatter
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)

    # Set specific loggers
    for logger_name in [
        "tracefix.main",
        "tracefix.agent_runner",
        "tracefix.session_manager",
        "tracefix.db",
        "tracefix.stream_parser",
        "tracefix.escalation",
        "tracefix.github_client",
    ]:
        logging.getLogger(logger_name).setLevel(level)
