-- Husbilsappen database schema (MySQL / MariaDB)
-- Import via phpMyAdmin, or: mysql -u USER -p DBNAME < server/schema.sql

CREATE TABLE IF NOT EXISTS recipes (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  servings INT NOT NULL DEFAULT 4,
  instructions TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id VARCHAR(36) PRIMARY KEY,
  recipe_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount DOUBLE NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_recipe_ingredients_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(36) PRIMARY KEY,
  location ENUM('hemma','husbil') NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount DOUBLE NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trips (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trip_recipe_selections (
  id VARCHAR(36) PRIMARY KEY,
  trip_id VARCHAR(36) NOT NULL,
  recipe_id VARCHAR(36) NOT NULL,
  portions DOUBLE NOT NULL DEFAULT 0,
  CONSTRAINT fk_trs_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_trs_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_trip_recipe (trip_id, recipe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS checklists (
  id VARCHAR(36) PRIMARY KEY,
  kind ENUM('packlista','rutin') NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS checklist_items (
  id VARCHAR(36) PRIMARY KEY,
  checklist_id VARCHAR(36) NOT NULL,
  text VARCHAR(500) NOT NULL,
  checked TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_checklist_items_checklist FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS trip_extra_items (
  id VARCHAR(36) PRIMARY KEY,
  trip_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount DOUBLE NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_extra_items_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS log_entries (
  id VARCHAR(36) PRIMARY KEY,
  entry_date DATE NOT NULL,
  mileage DOUBLE NULL,
  note TEXT NOT NULL DEFAULT '',
  image_path VARCHAR(500) NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Enda raden har alltid id='singleton' - husbilen är ju bara en.
CREATE TABLE IF NOT EXISTS vehicle_data (
  id VARCHAR(36) PRIMARY KEY,
  length_m DOUBLE NULL,
  width_m DOUBLE NULL,
  height_m DOUBLE NULL,
  total_weight_kg DOUBLE NULL,
  curb_weight_kg DOUBLE NULL,
  registration_number VARCHAR(50) NULL,
  water_tank_l DOUBLE NULL,
  waste_water_tank_l DOUBLE NULL,
  notes TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS service_entries (
  id VARCHAR(36) PRIMARY KEY,
  entry_date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  mileage DOUBLE NULL,
  cost DOUBLE NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS places (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  rating INT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL DEFAULT '',
  category VARCHAR(100) NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fuel_entries (
  id VARCHAR(36) PRIMARY KEY,
  entry_date DATE NOT NULL,
  mileage DOUBLE NOT NULL,
  liters DOUBLE NOT NULL,
  cost DOUBLE NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
