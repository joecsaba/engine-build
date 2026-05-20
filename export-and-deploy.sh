#!/bin/bash
set -e

echo "=== Engine-build.com: Export DB + Deploy ==="

DB_CONTAINER="engine-db"
DB_USER="engine"
DB_NAME="engine_data"
DATA_DIR="c:/Engine Website/artifacts/engine-build/public/data"
AWS="/c/Program Files/Amazon/AWSCLIV2/aws.exe"
DISTRIBUTION_ID="E19AA5JJA6WGT"
MIN_CONFIDENCE=0.7

echo ""
echo "1/5 — Exporting manufacturers and families..."
mkdir -p "$DATA_DIR/engines"

docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "
SELECT json_agg(t) FROM (SELECT slug, name, country FROM manufacturers ORDER BY name) t;
" > "$DATA_DIR/manufacturers.json"

docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "
SELECT json_agg(t) FROM (
  SELECT ef.slug as family_slug, m.slug as manufacturer_slug, m.name as manufacturer_name,
    ef.name as family_name, ef.configuration,
    COUNT(DISTINCT e.id) as engine_count
  FROM engine_families ef
  JOIN manufacturers m ON ef.manufacturer_id = m.id
  JOIN engines e ON e.family_id = ef.id
  GROUP BY ef.slug, m.slug, m.name, ef.name, ef.configuration
  ORDER BY m.name, ef.name
) t;
" > "$DATA_DIR/families.json"

echo "2/5 — Exporting engine families (confidence >= $MIN_CONFIDENCE)..."
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "
SELECT DISTINCT ef.slug, m.slug FROM engine_families ef
JOIN manufacturers m ON ef.manufacturer_id = m.id
JOIN engines e ON e.family_id = ef.id;
" | while IFS='|' read -r family_slug mfr_slug; do
  mkdir -p "$DATA_DIR/engines/$mfr_slug"
  docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "
  SELECT json_build_object(
    'family', ef.name,
    'manufacturer', m.name,
    'configuration', ef.configuration,
    'engines', (
      SELECT json_agg(eng_data ORDER BY eng_data->>'year')
      FROM (
        SELECT json_build_object(
          'engine_id', e.engine_id,
          'year', e.year,
          'displacement_ci', e.displacement_ci,
          'displacement_l', e.displacement_l,
          'num_cylinders', e.num_cylinders,
          'bore_in', e.bore_in,
          'stroke_in', e.stroke_in,
          'rod_length_in', e.rod_length_in,
          'compression_ratio', e.compression_ratio,
          'advertised_hp', e.advertised_hp,
          'fuel_type', e.fuel_type,
          'firing_order', e.firing_order,
          'block_material', e.block_material,
          'head_material', e.head_material,
          'valvetrain', e.valvetrain,
          'nhra_verified', e.nhra_verified,
          'vehicles', (SELECT json_agg(json_build_object('name', ev.vehicle_name, 'year_start', ev.year_start, 'year_end', ev.year_end)) FROM engine_vehicles ev WHERE ev.engine_id = e.id),
          'variants', (SELECT json_agg(json_build_object('code', v.variant_code, 'description', v.description)) FROM engine_variants v WHERE v.engine_id = e.id),
          'head', (SELECT json_build_object('head_cc', eh.head_cc, 'intake_valve_dia', eh.intake_valve_diameter_in, 'exhaust_valve_dia', eh.exhaust_valve_diameter_in, 'valve_stem_dia', eh.valve_stem_diameter_in, 'rocker_ratio', eh.rocker_ratio, 'lifter_type', eh.lifter_type, 'cam_intake_lift', eh.cam_intake_lift, 'cam_exhaust_lift', eh.cam_exhaust_lift, 'spring_type', eh.spring_type, 'head_gasket_thickness', eh.head_gasket_thickness_in) FROM engine_heads eh WHERE eh.engine_id = e.id LIMIT 1),
          'clearances', (SELECT json_build_object('main_journal', ec.main_journal_diameter_in, 'rod_journal', ec.rod_journal_diameter_in, 'main_clearance_min', ec.main_bearing_clearance_min, 'main_clearance_max', ec.main_bearing_clearance_max, 'rod_clearance_min', ec.rod_bearing_clearance_min, 'rod_clearance_max', ec.rod_bearing_clearance_max, 'piston_wall_min', ec.piston_to_wall_clearance_min, 'piston_wall_max', ec.piston_to_wall_clearance_max, 'crank_endplay_min', ec.crankshaft_endplay_min, 'crank_endplay_max', ec.crankshaft_endplay_max, 'ring_gap_top', ec.ring_end_gap_top, 'ring_gap_second', ec.ring_end_gap_second, 'ring_gap_oil', ec.ring_end_gap_oil) FROM engine_clearances ec WHERE ec.engine_id = e.id LIMIT 1),
          'torque_specs', (
            SELECT json_agg(json_build_object(
              'component', ts.component,
              'display_name', ts.display_name,
              'lubricant', ts.lubricant,
              'bolt_type', ts.bolt_type,
              'reusable', ts.reusable,
              'steps', (SELECT json_agg(json_build_object('step', tst.step_number, 'ft_lbs', tst.value_ftlbs, 'nm', tst.value_nm, 'angle', tst.angle_degrees, 'notes', tst.notes) ORDER BY tst.step_number) FROM torque_steps tst WHERE tst.torque_spec_id = ts.id)
            ) ORDER BY ts.component)
            FROM torque_specs ts WHERE ts.engine_id = e.id AND ts.confidence >= $MIN_CONFIDENCE
          )
        ) as eng_data
        FROM engines e WHERE e.family_id = ef.id
      ) sub
    )
  )
  FROM engine_families ef
  JOIN manufacturers m ON ef.manufacturer_id = m.id
  WHERE ef.slug = '$family_slug';
  " > "$DATA_DIR/engines/$mfr_slug/$family_slug.json"
done

FILE_COUNT=$(find "$DATA_DIR/engines" -name "*.json" | wc -l)
echo "   Exported $FILE_COUNT family files"

echo "2.5/5 — Exporting supplemental data tables..."

# Transmissions
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "
SELECT json_agg(t ORDER BY t.name) FROM (
  SELECT slug, name, type, speeds, gear_1, gear_2, gear_3, gear_4, gear_5, gear_6, gear_7, reverse, notes
  FROM transmissions ORDER BY name
) t;
" > "$DATA_DIR/transmissions.json"
echo "   Transmissions exported"

# Turbo models
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "
SELECT json_agg(t ORDER BY t.brand, t.model) FROM (
  SELECT brand, model, frame, compressor_wheel_mm, max_flow_lbmin, max_pressure_ratio,
    surge_flow_lbmin, turbine_wheel_mm, exhaust_flange, ar_options, application,
    hp_range_min, hp_range_max, fuel_type, notes
  FROM turbo_models ORDER BY brand, model
) t;
" > "$DATA_DIR/turbo_models.json"
echo "   Turbo models exported"

# Head flow profiles
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "
SELECT json_agg(t ORDER BY t.engine_family, t.name) FROM (
  SELECT name, manufacturer, engine_family, valve_size_intake, valve_size_exhaust,
    test_pressure_inwc, peak_intake_cfm, peak_exhaust_cfm, port_type, flow_data, notes
  FROM head_flow_profiles ORDER BY engine_family, name
) t;
" > "$DATA_DIR/head_flow_profiles.json"
echo "   Head flow profiles exported"

# Diesel platforms
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "
SELECT json_agg(t ORDER BY t.name) FROM (
  SELECT slug, name, engine_family, displacement_ci, cylinders, bore_in, stock_hp, stock_torque,
    injection_type, supply_pressure_min, supply_pressure_max, max_egt_sustained, max_egt_peak,
    stock_turbo, nozzle_specs, lift_pump_specs, notes
  FROM diesel_platforms ORDER BY name
) t;
" > "$DATA_DIR/diesel_platforms.json"
echo "   Diesel platforms exported"

# Ring gap specs (platform-specific absolute gap specs from multiple sources)
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "
SELECT json_agg(t ORDER BY t.platform_slug, t.sort_order) FROM (
  SELECT platform_slug, engine_label, bore_in, source, source_detail, application,
    top_ring_min, top_ring_max, second_ring_min, second_ring_max,
    oil_ring_min, oil_ring_max, multiplier_top, multiplier_second, notes, sort_order
  FROM ring_gap_specs ORDER BY platform_slug, sort_order
) t;
" > "$DATA_DIR/ring_gap_specs.json"
echo "   Ring gap specs exported"

# Ring gap multipliers (per-inch-of-bore multipliers by application)
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "
SELECT json_agg(t ORDER BY t.sort_order) FROM (
  SELECT source, application, label, fuel_type, top_multiplier, second_multiplier, oil_min, notes, sort_order
  FROM ring_gap_multipliers ORDER BY sort_order
) t;
" > "$DATA_DIR/ring_gap_multipliers.json"
echo "   Ring gap multipliers exported"

# Bolt specs (head bolt / main bolt sizes by platform)
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -A -c "
SELECT json_agg(platform ORDER BY platform.sort_order) FROM (
  SELECT
    p.platform_slug AS slug,
    p.display_name,
    p.manufacturer,
    p.sort_order,
    (SELECT json_agg(b ORDER BY b.variant) FROM (
      SELECT variant, thread_callout, diameter_in, diameter_mm, thread_pitch_tpi, thread_pitch_mm,
        bolt_count, factory_type, hex_size, common_upgrade, notes
      FROM bolt_specs WHERE platform_slug = p.platform_slug AND location = 'head'
    ) b) AS head_bolts,
    (SELECT json_agg(b ORDER BY b.variant) FROM (
      SELECT variant, thread_callout, diameter_in, diameter_mm, thread_pitch_tpi, thread_pitch_mm,
        bolt_count, factory_type, hex_size, common_upgrade, notes
      FROM bolt_specs WHERE platform_slug = p.platform_slug AND location = 'main'
    ) b) AS main_bolts
  FROM bolt_spec_platforms p
  ORDER BY p.sort_order
) platform;
" > "$DATA_DIR/bolt_specs.json"
echo "   Bolt specs exported"

echo "3/5 — Building site..."
cd "c:/Engine Website"
pnpm --filter @workspace/engine-build run build 2>&1 | tail -3

echo "4/5 — Uploading to S3..."
"$AWS" s3 sync "c:/Engine Website/artifacts/engine-build/dist/public/" s3://engine-build-com-site/ --delete 2>&1 | tail -3

echo "5/5 — Invalidating CloudFront cache..."
"$AWS" cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --query 'Invalidation.Id' --output text

echo ""
echo "=== Done! Site will be live in ~60 seconds ==="
