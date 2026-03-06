Config = {}

-- Maximum weight a player's bag can hold (kg)
Config.MaxWeightBag = 1000.0

-- Maximum weight the protected container can hold (kg)
Config.MaxWeightContainer = 100.0

-- Items that spawn a vehicle when used.
-- Key = item name in DB, Value = vehicle spawn model name
Config.VehicleItems = {
    ['VEHICLE_DELUXO'] = 'deluxo',
    ['VEHICLE_SCARAB'] = 'scarab',
}

-- Items that act as custom weapons (non-native GTA weapons).
-- Key = item name in DB, Value = native weapon hash name
-- Example: ['custom_katana'] = 'WEAPON_KNIFE'
Config.WeaponItems = {}
