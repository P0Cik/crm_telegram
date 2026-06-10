"""
Заполнение справочника Brand -> ModelGroup -> Model из faceted-навигации Encar
(блок ``iNav``). inav раскрывает дерево групп/моделей только для запрошенной
марки, поэтому для полноты задача обходит марки по очереди.
"""
from __future__ import annotations

import logging

from . import sync

logger = logging.getLogger(__name__)


def _find_node(nodes, name):
    """Рекурсивно ищет узел фасета с заданным Name."""
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
    node = None
    for n in ref.get("Nodes", []) or []:
        if n.get("Name") == node_name:
            node = n
            break
    return (node.get("Facets", []) if node else []) or []


def upsert_catalog_from_inav(inav: dict, source: str = sync.SOURCE) -> dict:
    """
    Обходит дерево Manufacturer -> ModelGroup -> Model в inav и апсертит каталог.
    Возвращает счётчики созданных уровней.
    """
    nodes = (inav or {}).get("Nodes", [])
    man_node = _find_node(nodes, "Manufacturer")
    stats = {"brands": 0, "groups": 0, "models": 0}
    if not man_node:
        return stats

    for man_facet in man_node.get("Facets", []) or []:
        brand_ko = man_facet.get("Value")
        if not brand_ko:
            continue
        brand, _, _ = sync.get_or_create_catalog(brand_ko, source=source)
        if brand:
            stats["brands"] += 1
        groups = _child_facets(man_facet, "ModelGroup")
        for grp_facet in groups:
            group_ko = grp_facet.get("Value")
            if not group_ko:
                continue
            _, group, _ = sync.get_or_create_catalog(brand_ko, group_ko, source=source)
            if group:
                stats["groups"] += 1
            for model_facet in _child_facets(grp_facet, "Model"):
                model_ko = model_facet.get("Value")
                if not model_ko:
                    continue
                sync.get_or_create_catalog(brand_ko, group_ko, model_ko, source=source)
                stats["models"] += 1
    return stats
