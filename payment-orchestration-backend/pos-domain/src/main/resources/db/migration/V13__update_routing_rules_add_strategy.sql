-- Make preferred_provider nullable so a rule can use strategy-based selection instead
ALTER TABLE routing_rules ALTER COLUMN preferred_provider DROP NOT NULL;

-- Add strategy column: when set (and preferred_provider is null), RoutingEngine
-- delegates to the named strategy class rather than picking a specific provider
ALTER TABLE routing_rules ADD COLUMN strategy VARCHAR(30);
