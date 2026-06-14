"""
Заполнение справочника Brand -> ModelGroup -> Model из faceted-навигации Encar
(блок ``iNav``).

У каждого фасета в ``Metadata`` есть ``EngName`` (английское название) и ``Code`` —
их и берём как ``name_en``/``code``. inav раскрывает дочерние уровни только для
выбранного узла, поэтому полнота достигается по уровням:
  * все марки           — из любого inav (узел ``Manufacturer``);
  * группы марки         — из inav с выбранной маркой (``build_q(brand)``);
  * модели группы        — из inav с выбранной группой (``build_q(brand, group)``).
"""
from __future__ import annotations

import logging

from . import sync

logger = logging.getLogger(__name__)


def _meta_first(metadata, key):
    """Metadata-поля inav — списки из одного элемента; берём первый."""
    vals = (metadata or {}).get(key)
    if isinstance(vals, list):
        return vals[0] if vals else None
    return vals


def _find_node(nodes, name):
    """Рекурсивно ищет первый узел фасета с заданным Name."""
    for node in nodes or []:
        if node.get("Name") == name:
            return node
        for facet in node.get("Facets", []) or []:
            ref = facet.get("Refinements")
            if ref:
                found = _find_node(ref.get("Nodes", []), name)
                if found:
                    return found
    return None


def _child_facets(facet, node_name):
    """Фасеты дочернего узла node_name внутри Refinements данного фасета."""
    ref = facet.get("Refinements")
    if not ref:
        return []
    for n in ref.get("Nodes", []) or []:
        if n.get("Name") == node_name:
            return (n.get("Facets", []) or [])
    return []


def iter_facets(inav, node_name):
    """[(value, en, code), ...] для всех фасетов узла node_name в inav."""
    node = _find_node((inav or {}).get("Nodes", []), node_name)
    out = []
    for facet in (node.get("Facets", []) if node else []) or []:
        value = facet.get("Value")
        if not value:
            continue
        meta = facet.get("Metadata", {}) or {}
        en = _meta_first(meta, "EngName") or ""
        code = _meta_first(meta, "Code") or ""
        out.append((value, str(en or "").strip(), str(code or "").strip()))
    return out


def upsert_brands(inav, source: str = sync.SOURCE) -> int:
    """Апсертит все марки из узла Manufacturer (с EngName/Code). Возвращает кол-во."""
    n = 0
    for value, en, code in iter_facets(inav, "Manufacturer"):
        sync.get_or_create_catalog(value, source=source, brand_en=en, brand_code=code)
        n += 1
    return n


def upsert_groups(inav, brand_ko: str, source: str = sync.SOURCE) -> int:
    """Апсертит все группы моделей выбранной марки из узла ModelGroup."""
    n = 0
    for value, en, code in iter_facets(inav, "ModelGroup"):
        sync.get_or_create_catalog(brand_ko, value, source=source,
                                   group_en=en, group_code=code)
        n += 1
    return n


def upsert_models(inav, brand_ko: str, group_ko: str, source: str = sync.SOURCE) -> int:
    """Апсертит все модели выбранной группы из узла Model."""
    n = 0
    for value, en, code in iter_facets(inav, "Model"):
        sync.get_or_create_catalog(brand_ko, group_ko, value, source=source,
                                   model_en=en, model_code=code)
        n += 1
    return n


def upsert_catalog_from_inav(inav: dict, source: str = sync.SOURCE) -> dict:
    """
    Обходит всё дерево Manufacturer -> ModelGroup -> Model в ПЕРЕДАННОМ inav и
    апсертит каталог с английскими названиями (Metadata.EngName). Полнота зависит
    от inav: в нём раскрыты дочерние уровни только для выбранного пути. Удобно для
    загрузки из локальной фикстуры (seed_brands). Возвращает счётчики уровней.
    """
    stats = {"brands": 0, "groups": 0, "models": 0}
    man_node = _find_node((inav or {}).get("Nodes", []), "Manufacturer")
    if not man_node:
        return stats

    for man_facet in man_node.get("Facets", []) or []:
        brand_ko = man_facet.get("Value")
        if not brand_ko:
            continue
        bmeta = man_facet.get("Metadata", {}) or {}
        sync.get_or_create_catalog(
            brand_ko, source=source,
            brand_en=str(_meta_first(bmeta, "EngName") or "").strip(),
            brand_code=str(_meta_first(bmeta, "Code") or "").strip(),
        )
        stats["brands"] += 1

        for grp_facet in _child_facets(man_facet, "ModelGroup"):
            group_ko = grp_facet.get("Value")
            if not group_ko:
                continue
            gmeta = grp_facet.get("Metadata", {}) or {}
            sync.get_or_create_catalog(
                brand_ko, group_ko, source=source,
                group_en=str(_meta_first(gmeta, "EngName") or "").strip(),
                group_code=str(_meta_first(gmeta, "Code") or "").strip(),
            )
            stats["groups"] += 1

            for model_facet in _child_facets(grp_facet, "Model"):
                model_ko = model_facet.get("Value")
                if not model_ko:
                    continue
                mmeta = model_facet.get("Metadata", {}) or {}
                sync.get_or_create_catalog(
                    brand_ko, group_ko, model_ko, source=source,
                    model_en=str(_meta_first(mmeta, "EngName") or "").strip(),
                    model_code=str(_meta_first(mmeta, "Code") or "").strip(),
                )
                stats["models"] += 1
    return stats
