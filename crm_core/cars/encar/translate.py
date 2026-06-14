"""
Автоперевод новых значений-перечислений Encar через deep-translator (Google),
с сохранением результата в единый справочник БД (модель ValueTranslation).

Справочник — единственный источник переводов (см. normalization.py). Эта задача
лишь дозаполняет его значениями, которых в нём ещё нет (новые цвета/кузова/...,
появившиеся в источнике после первичного сида из inav). Работает мягко: если
библиотека deep-translator не установлена или нет сети — функции не падают, а
возвращают пустую строку, и значение остаётся непереведённым (raw) до следующего
запуска задачи; исходное значение при этом не теряется.
"""
from __future__ import annotations

import logging

from . import normalization as norm

logger = logging.getLogger(__name__)

# Большинство значений Encar — корейские; 'auto' позволяет переводить и латиницу.
DEFAULT_SOURCE_LANG = "auto"


def translator_available() -> bool:
    try:
        import deep_translator  # noqa: F401
        return True
    except Exception:
        return False


def translate_text(text: str, target: str, source: str = DEFAULT_SOURCE_LANG) -> str:
    """Переводит строку через GoogleTranslator. Возвращает '' при ошибке/офлайне."""
    text = (text or "").strip()
    if not text:
        return ""
    try:
        from deep_translator import GoogleTranslator
        result = GoogleTranslator(source=source, target=target).translate(text)
        return (result or "").strip()
    except Exception as exc:
        logger.warning("Автоперевод не удался для %r (%s->%s): %s", text, source, target, exc)
        return ""


def translate_value(kind: str, source_value: str, *, store: bool = True):
    """
    Возвращает (ru, en) для значения перечисления.

    Порядок: существующая запись справочника (ValueTranslation) -> автоперевод
    (ko/auto -> ru и -> en). При store=True результат автоперевода сохраняется в
    ValueTranslation (auto=True), чтобы не переводить повторно.
    """
    value = (source_value or "").strip()
    if not value:
        return ("", "")

    from ..models import ValueTranslation
    # 1) уже есть в справочнике?
    existing = ValueTranslation.objects.filter(kind=kind, source_value=value).first()
    if existing and not existing.pending:
        return (existing.name_ru, existing.name_en)

    # 2) автоперевод
    ru = translate_text(value, target="ru")
    en = translate_text(value, target="en")
    if store and (ru or en):
        ValueTranslation.objects.update_or_create(
            kind=kind, source_value=value,
            defaults={"name_ru": ru, "name_en": en, "auto": True},
        )
        norm.refresh_translation_cache()
    return (ru, en)


def ensure_pending(kind: str, source_value: str) -> None:
    """Регистрирует значение как «ожидающее перевода» (пустая запись), если его
    ещё нет в справочнике. Позже задача auto-translate его дозаполнит."""
    value = (source_value or "").strip()
    if not value or norm.is_known(kind, value):
        return
    from ..models import ValueTranslation
    ValueTranslation.objects.get_or_create(kind=kind, source_value=value)
