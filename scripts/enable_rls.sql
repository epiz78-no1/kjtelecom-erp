-- Enable RLS on core data tables
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outgoing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Force RLS to apply even to the table owner (the app user)
ALTER TABLE inventory_items FORCE ROW LEVEL SECURITY;
ALTER TABLE outgoing_records FORCE ROW LEVEL SECURITY;
ALTER TABLE incoming_records FORCE ROW LEVEL SECURITY;
ALTER TABLE material_usage_records FORCE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE ROW LEVEL SECURITY;
ALTER TABLE divisions FORCE ROW LEVEL SECURITY;
ALTER TABLE positions FORCE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;

-- Create Policies
-- Policy: Only allow access if tenant_id matches app.current_tenant

-- 1. Inventory Items
DROP POLICY IF EXISTS tenant_isolation_policy ON inventory_items;
CREATE POLICY tenant_isolation_policy ON inventory_items
    USING (tenant_id = current_setting('app.current_tenant', true)::text)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- 2. Outgoing Records
DROP POLICY IF EXISTS tenant_isolation_policy ON outgoing_records;
CREATE POLICY tenant_isolation_policy ON outgoing_records
    USING (tenant_id = current_setting('app.current_tenant', true)::text)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- 3. Incoming Records
DROP POLICY IF EXISTS tenant_isolation_policy ON incoming_records;
CREATE POLICY tenant_isolation_policy ON incoming_records
    USING (tenant_id = current_setting('app.current_tenant', true)::text)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- 4. Material Usage Records
DROP POLICY IF EXISTS tenant_isolation_policy ON material_usage_records;
CREATE POLICY tenant_isolation_policy ON material_usage_records
    USING (tenant_id = current_setting('app.current_tenant', true)::text)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- 5. Teams
DROP POLICY IF EXISTS tenant_isolation_policy ON teams;
CREATE POLICY tenant_isolation_policy ON teams
    USING (tenant_id = current_setting('app.current_tenant', true)::text)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- 6. Divisions
DROP POLICY IF EXISTS tenant_isolation_policy ON divisions;
CREATE POLICY tenant_isolation_policy ON divisions
    USING (tenant_id = current_setting('app.current_tenant', true)::text)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- 7. Positions
DROP POLICY IF EXISTS tenant_isolation_policy ON positions;
CREATE POLICY tenant_isolation_policy ON positions
    USING (tenant_id = current_setting('app.current_tenant', true)::text)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- 8. Categories
DROP POLICY IF EXISTS tenant_isolation_policy ON categories;
CREATE POLICY tenant_isolation_policy ON categories
    USING (tenant_id = current_setting('app.current_tenant', true)::text)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- 9. Suppliers
DROP POLICY IF EXISTS tenant_isolation_policy ON suppliers;
CREATE POLICY tenant_isolation_policy ON suppliers
    USING (tenant_id = current_setting('app.current_tenant', true)::text)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);

-- 10. Invitations
DROP POLICY IF EXISTS tenant_isolation_policy ON invitations;
CREATE POLICY tenant_isolation_policy ON invitations
    USING (tenant_id = current_setting('app.current_tenant', true)::text)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::text);
