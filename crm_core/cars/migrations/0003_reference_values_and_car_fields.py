"""
П.1/2: единый справочник значений (ValueTranslation как единственный источник
переводов) + расширение собираемых данных по авто.

Изменения:
  * ValueTranslation: + canonical (код для топлива/КПП), + name_hex (HEX цвета);
    в Kind добавлен seatcolor (цвет салона), убран brand (марки — на английском
    из API, переводятся не здесь).
  * Car: + badge_en, vehicle_no, interior_color(+_raw,+_hex), body_type_raw.
  * CarPhoto: + image_number (номер изображения для корректного порядка фото).
  * Data: первичный сид справочника из inav (cars/fixtures/reference_values.json,
    все возможные значения с RU/EN/canonical/hex) и бэкофилл image_number у уже
    сохранённых фото по имени файла (..._NNN.jpg).
"""
import json
import re
from pathlib import Path

from django.db import migrations, models

_PHOTO_NUM_RE = re.compile(r"_(\d+)\.[a-zA-Z]+$")
FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "reference_values.json"


def seed_reference_values(apps, schema_editor):
    ValueTranslation = apps.get_model("cars", "ValueTranslation")
    if not FIXTURE.exists():
        return
    with open(FIXTURE, encoding="utf-8") as f:
        rows = json.load(f)
    for r in rows:
        ValueTranslation.objects.update_or_create(
            kind=r["kind"], source_value=r["source_value"],
            defaults={
                "name_ru": r.get("name_ru", ""),
                "name_en": r.get("name_en", ""),
                "canonical": r.get("canonical", ""),
                "name_hex": r.get("name_hex", ""),
                "auto": False,
            },
        )


def backfill_photo_numbers(apps, schema_editor):
    CarPhoto = apps.get_model("cars", "CarPhoto")
    for photo in CarPhoto.objects.filter(image_number=0).iterator():
        m = _PHOTO_NUM_RE.search(photo.path or "")
        if m:
            photo.image_number = int(m.group(1))
            photo.save(update_fields=["image_number"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("cars", "0002_catalog_translations"),
    ]

    operations = [
        # --- ValueTranslation: новые поля + обновлённые виды ---
        migrations.AddField(
            model_name="valuetranslation",
            name="canonical",
            field=models.CharField(
                blank=True, default="", max_length=20,
                help_text="Код для БД (топливо: PETROL/DIESEL/...; КПП: AUTO/MANUAL/...)",
                verbose_name="Canonical-код"),
        ),
        migrations.AddField(
            model_name="valuetranslation",
            name="name_hex",
            field=models.CharField(
                blank=True, default="", max_length=16,
                help_text="HEX-цвет значения (для цвета кузова/салона)",
                verbose_name="Цвет (HEX)"),
        ),
        migrations.AlterField(
            model_name="valuetranslation",
            name="kind",
            field=models.CharField(
                choices=[("fuel", "Топливо"), ("transmission", "Коробка передач"),
                         ("body_type", "Тип кузова"), ("color", "Цвет"),
                         ("seatcolor", "Цвет салона"), ("region", "Регион")],
                db_index=True, max_length=20, verbose_name="Тип значения"),
        ),
        # --- Car: расширение собираемых данных ---
        migrations.AddField(
            model_name="car", name="badge_en",
            field=models.CharField(blank=True, default="", max_length=255,
                                    verbose_name="Комплектация (EN)"),
        ),
        migrations.AddField(
            model_name="car", name="vehicle_no",
            field=models.CharField(blank=True, default="", max_length=32,
                                    verbose_name="Гос. номер (источник)"),
        ),
        migrations.AddField(
            model_name="car", name="interior_color",
            field=models.CharField(blank=True, default="", max_length=50,
                                    verbose_name="Цвет салона"),
        ),
        migrations.AddField(
            model_name="car", name="interior_color_raw",
            field=models.CharField(blank=True, default="", max_length=50,
                                    verbose_name="Цвет салона (оригинал)"),
        ),
        migrations.AddField(
            model_name="car", name="interior_color_hex",
            field=models.CharField(blank=True, default="", max_length=16,
                                    verbose_name="Цвет салона (HEX)"),
        ),
        migrations.AddField(
            model_name="car", name="body_type_raw",
            field=models.CharField(blank=True, default="", max_length=50,
                                    verbose_name="Тип кузова (оригинал)"),
        ),
        # --- CarPhoto: номер изображения + порядок ---
        migrations.AddField(
            model_name="carphoto", name="image_number",
            field=models.IntegerField(
                default=0, db_index=True,
                help_text="Номер из имени файла (..._NNN.jpg) / поля code; задаёт порядок",
                verbose_name="Номер изображения"),
        ),
        migrations.AlterModelOptions(
            name="carphoto",
            options={"ordering": ["image_number", "ordering"],
                     "verbose_name": "Фото автомобиля",
                     "verbose_name_plural": "Фото автомобилей"},
        ),
        # --- Данные ---
        migrations.RunPython(seed_reference_values, noop),
        migrations.RunPython(backfill_photo_numbers, noop),
    ]
