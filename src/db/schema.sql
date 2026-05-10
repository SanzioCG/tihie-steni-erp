-- 1. Profiles (RBAC)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager', 'warehouseman', 'salesperson')) DEFAULT 'salesperson',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  type TEXT CHECK (type IN ('textile', 'profile', 'other')),
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name_uz TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  unit TEXT CHECK (unit IN ('m2', 'p.m', 'pcs')) NOT NULL,
  image_url TEXT,
  dimensions JSONB DEFAULT '{"width": null, "height": null, "length": null}',
  average_cost NUMERIC DEFAULT 0,
  width NUMERIC,
  height NUMERIC,
  length NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Batches (Inventory with Cost)
-- Also referred to as product_batches in some contexts
CREATE TABLE IF NOT EXISTS batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  purchase_price NUMERIC NOT NULL,
  purchase_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  warehouse_id UUID REFERENCES warehouses(id),
  batch_id UUID REFERENCES batches(id),
  type TEXT CHECK (type IN ('in', 'out', 'transfer')),
  quantity NUMERIC NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES batches(id),
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL
);

-- 9. RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Categories: Everyone can read, only admins can modify
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins can modify categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Warehouses: Everyone can read, only admins can modify
CREATE POLICY "Warehouses are viewable by everyone" ON warehouses FOR SELECT USING (true);
CREATE POLICY "Admins can modify warehouses" ON warehouses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Products: Everyone can read, admins and managers can modify
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Admins and managers can modify products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Batches: Everyone can read, admins, managers and warehousemen can modify
CREATE POLICY "Batches are viewable by everyone" ON batches FOR SELECT USING (true);
CREATE POLICY "Authorized roles can modify batches" ON batches FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'warehouseman'))
);

-- Sales: Everyone can read, admins, managers and salespeople can modify
CREATE POLICY "Sales are viewable by everyone" ON sales FOR SELECT USING (true);
CREATE POLICY "Authorized roles can modify sales" ON sales FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'salesperson'))
);

-- Sale Items: Same as Sales
CREATE POLICY "Sale items are viewable by everyone" ON sale_items FOR SELECT USING (true);
CREATE POLICY "Authorized roles can modify sale items" ON sale_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'salesperson'))
);

-- 10. Triggers for Automatic Calculations

-- Function to update sale total_amount
CREATE OR REPLACE FUNCTION update_sale_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sales
  SET total_amount = (
    SELECT SUM(quantity * unit_price)
    FROM sale_items
    WHERE sale_id = NEW.sale_id
  )
  WHERE id = NEW.sale_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_sale_item_change
AFTER INSERT OR UPDATE OR DELETE ON sale_items
FOR EACH ROW EXECUTE FUNCTION update_sale_total();

-- Function to handle inventory transactions on sale
CREATE OR REPLACE FUNCTION handle_sale_inventory()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory_transactions (product_id, warehouse_id, type, quantity, reason)
  VALUES (
    NEW.product_id, 
    (SELECT warehouse_id FROM batches WHERE id = NEW.batch_id),
    'out', 
    NEW.quantity, 
    'Sale: ' || NEW.sale_id
  );
  
  -- Update batch quantity
  UPDATE batches
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.batch_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_sale_item_insert
AFTER INSERT ON sale_items
FOR EACH ROW EXECUTE FUNCTION handle_sale_inventory();
