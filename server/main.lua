-- ============================================================
-- ESX Inventory – Server Script
-- Validates item movements, manages weight, handles actions
-- ============================================================

ESX = nil

TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)

-- ─── Config ───────────────────────────────────────────────
local MAX_WEIGHT = 40 -- kg

-- ─── Weight Helpers ───────────────────────────────────────

-- Default item weights (can be overridden by database)
local ItemWeights = {
    bread          = 0.3,
    water          = 0.5,
    phone          = 0.2,
    bandage        = 0.1,
    weapon_pistol  = 2.5,
    lockpick       = 0.1,
    armor          = 5.0,
    medkit         = 1.5,
    radio          = 0.8,
    flashlight     = 0.4,
    toolkit        = 2.0,
    rope           = 1.0,
    money_bag      = 3.0,
    gold_bar       = 5.0,
    diamond        = 0.1,
}

function GetItemWeight(itemName)
    return ItemWeights[itemName] or 0.1
end

function GetPlayerCurrentWeight(xPlayer)
    local totalWeight = 0.0
    local inventory = xPlayer.getInventory()

    for _, item in ipairs(inventory) do
        if item.count > 0 then
            local w = GetItemWeight(item.name)
            totalWeight = totalWeight + (w * item.count)
        end
    end

    return totalWeight
end

function CanCarryWeight(xPlayer, additionalWeight)
    local current = GetPlayerCurrentWeight(xPlayer)
    return (current + additionalWeight) <= MAX_WEIGHT
end

-- ─── Server Callbacks ─────────────────────────────────────

-- Move item between zones
ESX.RegisterServerCallback('esx_inventory:moveItem', function(source, cb, fromZone, toZone, fromSlot, toSlot)
    local xPlayer = ESX.GetPlayerFromId(source)

    if not xPlayer then
        cb(false)
        return
    end

    -- For now, movements within the same player inventory are always valid
    -- Cross-container movements would need additional logic
    if fromZone == 'bag' and toZone == 'bag' then
        -- Internal reorder – always valid
        cb(true)
        return
    end

    if fromZone == 'container' and toZone == 'bag' then
        -- Moving from container to bag – check weight
        -- In a full implementation, you'd track container contents separately
        cb(true)
        return
    end

    if fromZone == 'bag' and toZone == 'container' then
        -- Moving from bag to container
        cb(true)
        return
    end

    -- Default: allow
    cb(true)
end)

-- Use item
ESX.RegisterServerCallback('esx_inventory:useItem', function(source, cb, itemName, slot)
    local xPlayer = ESX.GetPlayerFromId(source)

    if not xPlayer then
        cb(false)
        return
    end

    local item = xPlayer.getInventoryItem(itemName)
    if item and item.count > 0 then
        -- Trigger the item use event (for other scripts to handle)
        xPlayer.useItem(itemName)
        cb(true)
    else
        cb(false)
    end
end)

-- Drop item
ESX.RegisterServerCallback('esx_inventory:dropItem', function(source, cb, itemName, count)
    local xPlayer = ESX.GetPlayerFromId(source)

    if not xPlayer then
        cb(false)
        return
    end

    local item = xPlayer.getInventoryItem(itemName)
    if item and item.count >= count then
        xPlayer.removeInventoryItem(itemName, count)
        print(('[esx_inventory] %s dropped %dx %s'):format(xPlayer.getName(), count, itemName))
        cb(true)
    else
        cb(false)
    end
end)

-- Give item to nearest player
ESX.RegisterServerCallback('esx_inventory:giveItem', function(source, cb, itemName, count)
    local xPlayer = ESX.GetPlayerFromId(source)

    if not xPlayer then
        cb(false)
        return
    end

    local item = xPlayer.getInventoryItem(itemName)
    if not item or item.count < count then
        cb(false)
        return
    end

    -- Find nearest player
    local playerPed = GetPlayerPed(source)
    local playerCoords = GetEntityCoords(playerPed)
    local closestPlayer = nil
    local closestDistance = 3.0 -- Max give distance

    local players = ESX.GetPlayers()
    for _, playerId in ipairs(players) do
        if playerId ~= source then
            local targetPed = GetPlayerPed(playerId)
            local targetCoords = GetEntityCoords(targetPed)
            local dist = #(playerCoords - targetCoords)

            if dist < closestDistance then
                closestDistance = dist
                closestPlayer = playerId
            end
        end
    end

    if closestPlayer then
        local xTarget = ESX.GetPlayerFromId(closestPlayer)
        local itemWeight = GetItemWeight(itemName) * count

        if CanCarryWeight(xTarget, itemWeight) then
            xPlayer.removeInventoryItem(itemName, count)
            xTarget.addInventoryItem(itemName, count)
            print(('[esx_inventory] %s gave %dx %s to %s'):format(
                xPlayer.getName(), count, itemName, xTarget.getName()
            ))
            cb(true)
        else
            xPlayer.showNotification('~r~Target inventory is full!')
            cb(false)
        end
    else
        xPlayer.showNotification('~r~No player nearby!')
        cb(false)
    end
end)

-- ─── Weight Info Command ──────────────────────────────────
RegisterCommand('myweight', function(source)
    local xPlayer = ESX.GetPlayerFromId(source)
    if xPlayer then
        local w = GetPlayerCurrentWeight(xPlayer)
        xPlayer.showNotification(('~b~Weight: %.1f / %d KG'):format(w, MAX_WEIGHT))
    end
end, false)

print('[esx_inventory] Server script loaded successfully')
