-- ============================================================
-- ESX Inventory – Client Script
-- Handles NUI toggle, controls, and item actions
-- ============================================================

ESX = nil
local isOpen = false

Citizen.CreateThread(function()
    while ESX == nil do
        TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)
        Citizen.Wait(100)
    end
end)

local CustomContainer = {}
local CustomShortkeys = {}
local spawnedBags = {}
local bagsOnGround = {}
local currentWeapon = nil
local nearbyBag = nil
local spawnedVehicle = nil
local spawnedVehicleModel = nil

function pickupBag(bagId)
    ESX.TriggerServerCallback('az_inventory:pickupBag', function(success)
        if success then
            ESX.ShowNotification("~g~Sac ramassé !")
        else
            ESX.ShowNotification("~r~Impossible de ramasser ce sac.")
        end
    end, bagId)
end

function OpenInventory()
    if isOpen then return end

    local playerData = ESX.GetPlayerData()
    if not playerData or not playerData.inventory then return end

    isOpen = true
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(true)

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
        container = CustomContainer,
        shortkeys = CustomShortkeys,
        maxWeight = 1000,
        playerName = GetPlayerName(PlayerId()),
        playerId = GetPlayerServerId(PlayerId())
    })
end

function RefreshInventoryNUI()
    if not isOpen then return end
    local playerData = ESX.GetPlayerData()
    if not playerData or not playerData.inventory then return end

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
        inventory = inventory,
        container = CustomContainer
    })
    
    SendNUIMessage({
        action = 'openInventory',
        inventory = inventory,
        container = CustomContainer,
        shortkeys = CustomShortkeys,
        maxWeight = 1000,
        playerName = GetPlayerName(PlayerId()),
        playerId = GetPlayerServerId(PlayerId())
    })
end

function CloseInventory()
    if not isOpen then return end
    isOpen = false
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
end

Citizen.CreateThread(function()
    while true do
        local sleep = 0
        local playerPed = PlayerPedId()
        local playerCoords = GetEntityCoords(playerPed)

        -- 1. GESTION DE L'INVENTAIRE (TAB)
        DisableControlAction(0, 37, true)
        
        if IsDisabledControlJustPressed(0, 37) then
            sleep = 0
            if isOpen then
                CloseInventory()
                SendNUIMessage({ action = 'closeInventory' })
            else
                OpenInventory()
            end
        end

        -- 2. LOGIQUE SI L'INVENTAIRE EST OUVERT
        if isOpen then
            sleep = 0
            -- Blocage des contrôles de combat/caméra
            DisableControlAction(0, 1, true) 
            DisableControlAction(0, 2, true)
            DisableControlAction(0, 24, true) 
            DisableControlAction(0, 25, true)
            DisableControlAction(0, 47, true)
            DisableControlAction(0, 58, true)
            DisableControlAction(0, 140, true)
            DisableControlAction(0, 141, true)
            DisableControlAction(0, 142, true)
            DisableControlAction(0, 257, true)
            DisableControlAction(0, 263, true)
            DisableControlAction(0, 264, true)
            -- Autorise E et K même avec le focus
            EnableControlAction(0, 38, true)
            EnableControlAction(0, 311, true)
        else
            -- 3. LOGIQUE DES RACCOURCIS (1-5) - SEULEMENT SI FERMÉ
            local keys = {157, 158, 160, 164, 165}
            for i = 1, #keys do
                if IsControlJustReleased(0, keys[i]) or IsDisabledControlJustReleased(0, keys[i]) then
                    sleep = 0
                    local itemName = CustomShortkeys[i]
                    
                    if itemName and type(itemName) == 'string' then
                        local isNativeWeapon = (string.sub(string.upper(itemName), 1, 7) == "WEAPON_")
                        local isCustomWeapon = (Config and Config.WeaponItems and Config.WeaponItems[itemName] ~= nil)

                        if isNativeWeapon or isCustomWeapon then
                            local weaponName = isCustomWeapon and Config.WeaponItems[itemName] or itemName
                            local weaponHash = GetHashKey(weaponName)

                            if currentWeapon == itemName then
                                SetCurrentPedWeapon(playerPed, GetHashKey("WEAPON_UNARMED"), true)
                                currentWeapon = nil
                            else
                                if HasPedGotWeapon(playerPed, weaponHash, false) then
                                    SetCurrentPedWeapon(playerPed, weaponHash, true)
                                    currentWeapon = itemName
                                else
                                    ESX.TriggerServerCallback('az_inventory:useItem', function(success)
                                        if success then currentWeapon = itemName end
                                    end, itemName, i - 1)
                                end
                            end
                        else
                            ESX.TriggerServerCallback('az_inventory:useItem', function(success) end, itemName, i - 1)
                        end
                    end
                end
            end
        end

        -- 4. TOUCHE K (VÉHICULE) - OUVERT OU FERMÉ
        if (IsControlJustReleased(0, 311) or IsDisabledControlJustReleased(0, 311)) then
            if spawnedVehicle ~= nil and DoesEntityExist(spawnedVehicle) then
                sleep = 0
                local vehCoords = GetEntityCoords(spawnedVehicle)
                local dist = #(playerCoords - vehCoords)
                
                if dist < 10.0 or GetVehiclePedIsIn(playerPed, false) == spawnedVehicle then
                    local modelToReturn = spawnedVehicleModel or "deluxo"
                    ESX.Game.DeleteVehicle(spawnedVehicle)
                    spawnedVehicle = nil
                    spawnedVehicleModel = nil
                    TriggerServerEvent('az_inventory:returnVehicleItem', modelToReturn)
                    ESX.ShowNotification('~g~Véhicule rangé dans votre inventaire !')

                    Citizen.SetTimeout(500, function()
                        if isOpen then RefreshInventoryNUI() end
                    end)
                else
                    ESX.ShowNotification('~r~Vous êtes trop loin de votre véhicule.')
                end
            end
        end

        -- 5. DÉTECTION DES SACS
        local playerCoords2D = vector2(playerCoords.x, playerCoords.y) 

        for bagId, data in pairs(spawnedBags) do
            local bagCoords2D = vector2(data.coords.x, data.coords.y)
            local dist = #(playerCoords2D - bagCoords2D)
            
            if dist < 3.0 then
                sleep = 0
                nearbyBag = bagId
                ESX.ShowHelpNotification("Appuyez sur ~INPUT_CONTEXT~ pour ramasser le sac")

                if IsControlJustReleased(0, 38) then 
                    pickupBag(bagId)
                end
                
                break 
            end
        end

        Citizen.Wait(sleep)
    end
end)

RegisterNetEvent('az_inventory:spawnBagProp')
AddEventHandler('az_inventory:spawnBagProp', function(bagId, coords)
    local model = `prop_paper_bag_01`
    
    RequestModel(model)
    while not HasModelLoaded(model) do Wait(0) end

    local obj = CreateObject(model, coords.x, coords.y, coords.z - 0.98, false, false, false)
    PlaceObjectOnGroundProperly(obj)
    FreezeEntityPosition(obj, true)
    SetEntityAsMissionEntity(obj, true, true)

    spawnedBags[bagId] = {obj = obj, coords = coords}
end)

RegisterNetEvent('az_inventory:removeBagProp')
AddEventHandler('az_inventory:removeBagProp', function(bagId)
    if spawnedBags[bagId] then
        DeleteEntity(spawnedBags[bagId].obj)
        spawnedBags[bagId] = nil
    end
end)

RegisterNetEvent('az_inventory:refreshInventoryUI')
AddEventHandler('az_inventory:refreshInventoryUI', function()
    if isOpen then
        RefreshInventoryNUI()
    end
end)

RegisterNetEvent('az_inventory:loadCustomData')
AddEventHandler('az_inventory:loadCustomData', function(container, shortkeys)
    CustomContainer = container or {}
    CustomShortkeys = shortkeys or {}
end)

RegisterNUICallback('closeInventory', function(data, cb)
    CloseInventory()
    cb('ok')
end)

RegisterNUICallback('moveItem', function(data, cb)
    if currentWeapon and data.item == currentWeapon and data.fromZone == 'bag' then
        TriggerEvent('az_inventory:removeWeaponFromPed', currentWeapon)
        ESX.ShowNotification('~y~Arme déséquipée automatiquement.')
    end

    ESX.TriggerServerCallback('az_inventory:moveItem', function(success, updatedContainer)
        if success then
            if updatedContainer then 
                CustomContainer = updatedContainer 
            end
            
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
                inventory = inventory,
                container = CustomContainer
            })
        end
        cb({ success = success })
    end, data.fromZone, data.toZone, data.item, data.count)
end)

RegisterNUICallback('useItem', function(data, cb)
    ESX.TriggerServerCallback('az_inventory:useItem', function(success)
        if success then
            TriggerEvent('esx:onPlayerData', ESX.GetPlayerData())
        end
        cb({ success = success })
    end, data.item, data.slot)
end)

RegisterNUICallback('dropItem', function(data, cb)
    if currentWeapon and data.item == currentWeapon then
        TriggerEvent('az_inventory:removeWeaponFromPed', currentWeapon)
        ESX.ShowNotification('~y~Arme déséquipée automatiquement.')
    end

    ESX.TriggerServerCallback('az_inventory:dropItem', function(success)
        if success then
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

RegisterNUICallback('giveItem', function(data, cb)
    if currentWeapon and data.item == currentWeapon then
        TriggerEvent('az_inventory:removeWeaponFromPed', currentWeapon)
        ESX.ShowNotification('~y~Arme déséquipée automatiquement.')
    end

    ESX.TriggerServerCallback('az_inventory:giveItem', function(success)
        cb({ success = success })
    end, data.item, data.count)
end)

RegisterNUICallback('setShortkey', function(data, cb)
    local slotIndex = data.slot + 1
    local oldItem = CustomShortkeys[slotIndex]
    
    if oldItem ~= nil and oldItem ~= false and oldItem == currentWeapon then
        local playerPed = PlayerPedId()
        
        SetCurrentPedWeapon(playerPed, GetHashKey("WEAPON_UNARMED"), true)
        
        local weaponHash = GetHashKey(oldItem)
        if Config and Config.WeaponItems and Config.WeaponItems[oldItem] then
            weaponHash = GetHashKey(Config.WeaponItems[oldItem])
        end
        RemoveWeaponFromPed(playerPed, weaponHash)
        
        currentWeapon = nil
        ESX.ShowNotification('~y~Arme retirée de la main.')
    end

    if data.item == nil then
        CustomShortkeys[slotIndex] = false
    else
        CustomShortkeys[slotIndex] = data.item
    end
    
    TriggerServerEvent('az_inventory:setShortkey', data.slot, data.item)
    cb('ok')
end)

RegisterNetEvent('az_inventory:giveWeaponToPed')
AddEventHandler('az_inventory:giveWeaponToPed', function(itemName, actualWeaponName)
    local playerPed = PlayerPedId()
    local weaponToGive = actualWeaponName or itemName
    local weaponHash = GetHashKey(weaponToGive)

    if not HasPedGotWeapon(playerPed, weaponHash, false) then
        GiveWeaponToPed(playerPed, weaponHash, 30, false, true)
    end

    SetCurrentPedWeapon(playerPed, weaponHash, true)
    currentWeapon = itemName
end)

RegisterNetEvent('az_inventory:removeWeaponFromPed')
AddEventHandler('az_inventory:removeWeaponFromPed', function(itemName)
    local playerPed = PlayerPedId()
    local actualWeaponName = itemName
    if Config and Config.WeaponItems and Config.WeaponItems[itemName] then
        actualWeaponName = Config.WeaponItems[itemName]
    end
    local weaponHash = GetHashKey(actualWeaponName)
    
    RemoveWeaponFromPed(playerPed, weaponHash)
    if currentWeapon == itemName then
        currentWeapon = nil
    end
end)

 RegisterNetEvent('az_inventory:spawnVehicle')
AddEventHandler('az_inventory:spawnVehicle', function(model)
    if spawnedVehicle and DoesEntityExist(spawnedVehicle) then
        ESX.ShowNotification('~r~Vous avez déjà un véhicule sorti !')
        return
    end

    local playerPed = PlayerPedId()
    local coords = GetEntityCoords(playerPed)
    local heading = GetEntityHeading(playerPed)

    ESX.Game.SpawnVehicle(model, coords, heading, function(vehicle)
        spawnedVehicle = vehicle
        spawnedVehicleModel = model
        TaskWarpPedIntoVehicle(playerPed, vehicle, -1)
        ESX.ShowNotification('~g~Véhicule sorti ! Appuyez sur ~y~K ~g~pour le ranger.')
    end)
end)

RegisterNetEvent('az_inventory:spawnBagProp')
AddEventHandler('az_inventory:spawnBagProp', function(bagId, coords)
    local model = `prop_big_bag_01`
    RequestModel(model)
    while not HasModelLoaded(model) do Wait(0) end

    local obj = CreateObject(model, coords.x, coords.y, coords.z - 1.0, false, false, false)
    PlaceObjectOnGroundProperly(obj)
    FreezeEntityPosition(obj, true)

    bagsOnGround[bagId] = obj
end)

RegisterNetEvent('az_inventory:removeBagProp')
AddEventHandler('az_inventory:removeBagProp', function(bagId)
    if bagsOnGround[bagId] then
        DeleteEntity(bagsOnGround[bagId])
        bagsOnGround[bagId] = nil
    end
end)