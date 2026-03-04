-- ============================================================
-- ESX Inventory – Client Script
-- Handles NUI toggle, controls, and item actions
-- ============================================================

ESX = nil
local isOpen = false

-- ─── ESX Init ─────────────────────────────────────────────
Citizen.CreateThread(function()
    while ESX == nil do
        TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)
        Citizen.Wait(100)
    end
end)

-- ─── Open Inventory ───────────────────────────────────────
function OpenInventory()
    if isOpen then return end

    local playerData = ESX.GetPlayerData()
    if not playerData or not playerData.inventory then return end

    isOpen = true
    SetNuiFocus(true, true)

    -- Build inventory data with weights
    local inventory = {}
    for _, item in ipairs(playerData.inventory) do
        if item.count > 0 then
            table.insert(inventory, {
                name = item.name,
                label = item.label,
                count = item.count,
                weight = item.weight or 0.1,
                description = item.description or ''
            })
        end
    end

    SendNUIMessage({
        action = 'openInventory',
        inventory = inventory,
        container = {},
        maxWeight = 40,
        playerName = GetPlayerName(PlayerId()),
        playerId = GetPlayerServerId(PlayerId())
    })
end

-- ─── Close Inventory ──────────────────────────────────────
function CloseInventory()
    if not isOpen then return end
    isOpen = false
    SetNuiFocus(false, false)
end

-- ─── Key Binding (TAB) ───────────────────────────────────
Citizen.CreateThread(function()
    while true do
        Citizen.Wait(0)

        if IsControlJustReleased(0, 37) then -- TAB key
            if isOpen then
                CloseInventory()
                SendNUIMessage({ action = 'closeInventory' })
            else
                OpenInventory()
            end
        end

        -- Disable controls while inventory is open
        if isOpen then
            DisableControlAction(0, 1, true)   -- LookLeftRight
            DisableControlAction(0, 2, true)   -- LookUpDown
            DisableControlAction(0, 24, true)  -- Attack
            DisableControlAction(0, 25, true)  -- Aim
            DisableControlAction(0, 30, true)  -- MoveLeftRight
            DisableControlAction(0, 31, true)  -- MoveUpDown
            DisableControlAction(0, 36, true)  -- Duck
            DisableControlAction(0, 44, true)  -- Cover
            DisableControlAction(0, 47, true)  -- Detonate
            DisableControlAction(0, 58, true)  -- Throw Grenade
            DisableControlAction(0, 140, true) -- Melee Light
            DisableControlAction(0, 141, true) -- Melee Heavy
            DisableControlAction(0, 142, true) -- Melee Alternate
            DisableControlAction(0, 143, true) -- Melee Block
            DisableControlAction(0, 257, true) -- Attack2
            DisableControlAction(0, 263, true) -- Melee Attack1
        end
    end
end)

-- ─── NUI Callbacks ────────────────────────────────────────

-- Close inventory
RegisterNUICallback('closeInventory', function(data, cb)
    CloseInventory()
    cb('ok')
end)

-- Move item between zones
RegisterNUICallback('moveItem', function(data, cb)
    ESX.TriggerServerCallback('esx_inventory:moveItem', function(success)
        if success then
            -- Refresh inventory display
            local playerData = ESX.GetPlayerData()
            local inventory = {}
            for _, item in ipairs(playerData.inventory) do
                if item.count > 0 then
                    table.insert(inventory, {
                        name = item.name,
                        label = item.label,
                        count = item.count,
                        weight = item.weight or 0.1,
                        description = item.description or ''
                    })
                end
            end
            SendNUIMessage({
                action = 'updateInventory',
                inventory = inventory
            })
        end
        cb({ success = success })
    end, data.fromZone, data.toZone, data.fromSlot, data.toSlot)
end)

-- Use item
RegisterNUICallback('useItem', function(data, cb)
    ESX.TriggerServerCallback('esx_inventory:useItem', function(success)
        if success then
            -- Refresh
            TriggerEvent('esx:onPlayerData', ESX.GetPlayerData())
        end
        cb({ success = success })
    end, data.item, data.slot)
end)

-- Drop item
RegisterNUICallback('dropItem', function(data, cb)
    ESX.TriggerServerCallback('esx_inventory:dropItem', function(success)
        if success then
            -- Refresh after drop
            local playerData = ESX.GetPlayerData()
            local inventory = {}
            for _, item in ipairs(playerData.inventory) do
                if item.count > 0 then
                    table.insert(inventory, {
                        name = item.name,
                        label = item.label,
                        count = item.count,
                        weight = item.weight or 0.1,
                        description = item.description or ''
                    })
                end
            end
            SendNUIMessage({
                action = 'updateInventory',
                inventory = inventory
            })
        end
        cb({ success = success })
    end, data.item, data.count)
end)

-- Give item
RegisterNUICallback('giveItem', function(data, cb)
    ESX.TriggerServerCallback('esx_inventory:giveItem', function(success)
        cb({ success = success })
    end, data.item, data.count)
end)

-- Set shortkey
RegisterNUICallback('setShortkey', function(data, cb)
    -- Store shortkey locally
    cb('ok')
end)

-- ─── Shortkey Usage (1-5 keys) ────────────────────────────
Citizen.CreateThread(function()
    while true do
        Citizen.Wait(0)

        if not isOpen then
            -- Keys 1-5 for shortkeys
            for i = 1, 5 do
                if IsControlJustReleased(0, 156 + i) then -- Keys 1-5
                    SendNUIMessage({
                        action = 'useShortkey',
                        slot = i - 1
                    })
                end
            end
        end
    end
end)
