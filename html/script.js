/* ============================================================
   ESX Inventory – GLife Extinction Style
   Client-side NUI Script
   ============================================================ */

(() => {
    'use strict';

    // ─── State ────────────────────────────────────────────────
    const state = {
        isOpen: false,
        bagItems: [],
        containerItems: [],
        shortkeyItems: [null, null, null, null, null, null],
        maxWeight: 40,
        containerMaxWeight: 15,
        selectedSlot: null,
        contextTarget: null,
        lastAction: null,
    };

    // ─── DOM References ───────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        container: $('#inventory-container'),
        bagGrid: $('#bag-grid'),
        containerGrid: $('#container-grid'),
        shortkeysSlots: $('#shortkeys-slots'),
        weightCurrent: $('#weight-current'),
        weightMax: $('#weight-max'),
        weightBarFill: $('#weight-bar-fill'),
        containerWeightCurrent: $('#container-weight-current'),
        containerWeightMax: $('#container-weight-max'),
        contextMenu: $('#context-menu'),
        tooltip: $('#item-tooltip'),
        tooltipName: $('#tooltip-name'),
        tooltipDesc: $('#tooltip-desc'),
        tooltipWeight: $('#tooltip-weight'),
        tooltipQty: $('#tooltip-qty'),
        playerName: $('#player-name'),
        playerId: $('#player-id'),
    };

    // ─── Test Mode Detection ──────────────────────────────────
    const isTestMode = typeof GetParentResourceName === 'undefined';
    const resourceName = isTestMode ? 'esx_inventory' : GetParentResourceName();

    // ─── Mock Data (Test Mode) ────────────────────────────────
    const MOCK_ITEMS = [
        // 🔫 Weapons
        { name: 'awp', label: 'AWP', count: 1, weight: 6.0, description: 'High-power sniper rifle.' },
        { name: 'awp_mk2', label: 'AWP MK2', count: 1, weight: 6.5, description: 'Upgraded high-power sniper rifle.' },
        { name: 'carbine', label: 'Carbine', count: 1, weight: 3.5, description: 'Standard assault rifle.' },
        { name: 'carbine_mk2', label: 'Carbine MK2', count: 1, weight: 3.8, description: 'Upgraded assault rifle.' },
        { name: 'ak47', label: 'AK-47', count: 1, weight: 4.3, description: 'Reliable assault rifle.' },
        { name: 'm4a1', label: 'M4A1', count: 1, weight: 3.6, description: 'Versatile assault rifle.' },
        { name: 'famas', label: 'Famas', count: 1, weight: 3.7, description: 'Bullpup assault rifle.' },
        { name: 'scar', label: 'SCAR', count: 1, weight: 4.0, description: 'Heavy assault rifle.' },
        { name: 'sniper', label: 'Sniper Rifle', count: 1, weight: 5.5, description: 'Long-range precision rifle.' },
        { name: 'sniper_mk2', label: 'Sniper Rifle MK2', count: 1, weight: 5.8, description: 'Upgraded precision rifle.' },
        { name: 'smg', label: 'SMG', count: 1, weight: 2.5, description: 'Submachine gun.' },
        { name: 'smg_mk2', label: 'SMG MK2', count: 1, weight: 2.8, description: 'Upgraded submachine gun.' },
        { name: 'micro_smg', label: 'Micro SMG', count: 1, weight: 1.5, description: 'Compact submachine gun.' },
        { name: 'pistol', label: 'Pistol', count: 1, weight: 1.0, description: 'Standard handgun.' },
        { name: 'pistol_mk2', label: 'Pistol MK2', count: 1, weight: 1.2, description: 'Upgraded handgun.' },
        { name: 'desert_eagle', label: 'Desert Eagle', count: 1, weight: 2.0, description: 'High-caliber handgun.' },
        { name: 'revolver', label: 'Revolver', count: 1, weight: 1.8, description: 'Heavy six-shooter.' },
        { name: 'shotgun', label: 'Shotgun', count: 1, weight: 4.0, description: 'Pump-action shotgun.' },
        { name: 'shotgun_mk2', label: 'Shotgun MK2', count: 1, weight: 4.5, description: 'Upgraded shotgun.' },
        { name: 'machine_gun', label: 'Machine Gun', count: 1, weight: 8.0, description: 'Heavy machine gun.' },

        // 🛡️ Utilities
        { name: 'bandage', label: 'Bandage', count: 10, weight: 0.1, description: 'Heals minor injuries.' },
        { name: 'medkit', label: 'Medkit', count: 3, weight: 1.0, description: 'Restores full health.' },
        { name: 'kevlar', label: 'Kevlar', count: 1, weight: 2.0, description: 'Standard body armor.' },
        { name: 'heavy_kevlar', label: 'Heavy Kevlar', count: 1, weight: 5.0, description: 'Heavy body armor.' },
        { name: 'green_syringe', label: 'Green Syringe', count: 5, weight: 0.1, description: 'Medical stimulant.' },
        { name: 'red_syringe', label: 'Red Syringe', count: 5, weight: 0.1, description: 'Combat stimulant.' },
        { name: 'blue_syringe', label: 'Blue Syringe', count: 5, weight: 0.1, description: 'Stamina boost.' },
        { name: 'painkillers', label: 'Painkillers', count: 10, weight: 0.1, description: 'Temporarily numbs pain.' },
        { name: 'adrenaline', label: 'Adrenaline', count: 2, weight: 0.2, description: 'Epinephrine auto-injector.' }
    ];

    const MOCK_CONTAINER = [
        { name: 'money_bag', label: 'Money Bag', count: 1, weight: 3.0, description: 'A bag full of cash.' },
        { name: 'gold_bar', label: 'Gold Bar', count: 2, weight: 5.0, description: 'Pure gold bar, very valuable.' },
        { name: 'diamond', label: 'Diamond', count: 3, weight: 0.1, description: 'A sparkling diamond.' },
    ];

    // ─── NUI Communication ────────────────────────────────────
    function postNUI(event, data = {}) {
        if (isTestMode) {
            console.log(`[NUI → Lua] ${event}`, data);
            // Simulate server response for test mode
            if (event === 'closeInventory') {
                closeInventory();
            }
            return Promise.resolve({ ok: true });
        }
        return fetch(`https://${resourceName}/${event}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    }

    // ─── Image Path ───────────────────────────────────────────
    function getItemImagePath(itemName) {
        if (isTestMode) {
            return `img/items/${itemName}.png`;
        }
        return `nui://${resourceName}/html/img/items/${itemName}.png`;
    }

    // ─── Weight Calculation ───────────────────────────────────
    function calculateWeight(items) {
        return items.reduce((total, item) => {
            if (!item) return total;
            return total + (item.weight || 0) * (item.count || 1);
        }, 0);
    }

    function updateWeightDisplay() {
        const bagWeight = calculateWeight(state.bagItems);
        const pct = Math.min((bagWeight / state.maxWeight) * 100, 100);

        dom.weightCurrent.textContent = bagWeight.toFixed(1);
        dom.weightMax.textContent = state.maxWeight;
        if (dom.weightBarFill) dom.weightBarFill.style.width = pct + '%';

        // Container weight
        const containerWeight = calculateWeight(state.containerItems);
        if (dom.containerWeightCurrent) {
            dom.containerWeightCurrent.textContent = containerWeight.toFixed(1);
        }
        if (dom.containerWeightMax) {
            dom.containerWeightMax.textContent = state.containerMaxWeight;
        }
    }

    function canFitItem(itemName, toZone) {
        if (toZone !== 'bag' && toZone !== 'container') return true;

        const allItems = [...MOCK_ITEMS, ...state.bagItems, ...state.containerItems];
        const itemDef = allItems.find(i => i && i.name === itemName);
        if (!itemDef) return true;

        if (toZone === 'bag') {
            return calculateWeight(state.bagItems) + (itemDef.weight || 0) <= state.maxWeight;
        } else if (toZone === 'container') {
            return calculateWeight(state.containerItems) + (itemDef.weight || 0) <= state.containerMaxWeight;
        }
        return true;
    }

    function moveOneItem(itemName, fromArray, toArray) {
        const fromIdx = fromArray.findIndex(i => i && i.name === itemName);
        if (fromIdx !== -1) {
            const item = fromArray[fromIdx];

            const toIdx = toArray.findIndex(i => i && i.name === itemName);
            if (toIdx !== -1) {
                toArray[toIdx].count += 1;
            } else {
                toArray.push({ ...item, count: 1 });
            }

            item.count -= 1;
            if (item.count <= 0) {
                fromArray.splice(fromIdx, 1);
                return true; // indicates the item stack was fully depleted
            }
        }
        return false;
    }

    // ─── Render Items ─────────────────────────────────────────
    function createItemSlot(item, zone, index) {
        const slot = document.createElement('div');
        slot.className = 'item-slot' + (item ? '' : ' empty');
        slot.dataset.zone = zone;
        slot.dataset.index = index;

        if (item) {
            slot.dataset.itemName = item.name;
            slot.innerHTML = `
                <img class="item-image" src="${getItemImagePath(item.name)}" alt="${item.label}" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23616161%22 stroke-width=%221.5%22><rect x=%222%22 y=%222%22 width=%2220%22 height=%2220%22 rx=%222%22/><line x1=%222%22 y1=%222%22 x2=%2222%22 y2=%2222%22/><line x1=%2222%22 y1=%222%22 x2=%222%22 y2=%2222%22/></svg>'">
                <div class="item-info">
                    <span class="item-name">${item.label}</span>
                    <div class="item-meta">
                        <span class="item-count">x${item.count}</span>
                        <span>${(item.weight * item.count).toFixed(1)}kg</span>
                    </div>
                </div>
            `;

            // Tooltip events
            slot.addEventListener('mouseenter', (e) => showTooltip(e, item));
            slot.addEventListener('mousemove', moveTooltip);
            slot.addEventListener('mouseleave', hideTooltip);

            // Context menu
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e, item, zone, index);
            });

            // Click to select or quick move
            slot.addEventListener('click', () => {
                if (state.lastAction && state.lastAction.fromZone === zone) {
                    const toZone = state.lastAction.toZone;

                    if (zone === 'bag' && toZone === 'container') {
                        if (!canFitItem(item.name, 'container')) return;

                        const depleted = moveOneItem(item.name, state.bagItems, state.containerItems);
                        if (depleted) {
                            const skIdx = state.shortkeyItems.findIndex(i => i && i.name === item.name);
                            if (skIdx !== -1) state.shortkeyItems[skIdx] = null;
                        }
                        postNUI('moveItem', { fromZone: 'bag', toZone: 'container', item: item.name, count: 1 });
                        renderAll();
                    } else if (zone === 'container' && toZone === 'bag') {
                        if (!canFitItem(item.name, 'bag')) return;

                        moveOneItem(item.name, state.containerItems, state.bagItems);
                        postNUI('moveItem', { fromZone: 'container', toZone: 'bag', item: item.name, count: 1 });
                        renderAll();
                    }
                    return; // Prevent normal selection click
                }

                $$('.item-slot.selected').forEach(s => s.classList.remove('selected'));
                slot.classList.add('selected');
                state.selectedSlot = { item, zone, index };
            });
        }

        return slot;
    }

    function renderBag() {
        dom.bagGrid.innerHTML = '';

        for (let i = 0; i < state.bagItems.length; i++) {
            const item = state.bagItems[i];
            if (item) {
                dom.bagGrid.appendChild(createItemSlot(item, 'bag', i));
            }
        }
        updateWeightDisplay();
    }

    function renderContainer() {
        dom.containerGrid.innerHTML = '';

        for (let i = 0; i < state.containerItems.length; i++) {
            const item = state.containerItems[i];
            if (item) {
                dom.containerGrid.appendChild(createItemSlot(item, 'container', i));
            }
        }
    }

    function renderShortkeys() {
        dom.shortkeysSlots.innerHTML = '';

        for (let i = 0; i < 6; i++) {
            const item = state.shortkeyItems[i];
            const slot = document.createElement('div');
            slot.className = 'shortkey-slot' + (item ? ' has-item' : '');
            slot.dataset.zone = 'shortkey';
            slot.dataset.index = i;

            let inner = `<span class="shortkey-number">${i + 1}</span>`;
            if (item) {
                slot.dataset.itemName = item.name;
                inner += `
                    <img class="item-image" src="${getItemImagePath(item.name)}" alt="${item.label}"
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23616161%22 stroke-width=%221.5%22><rect x=%222%22 y=%222%22 width=%2220%22 height=%2220%22 rx=%222%22/></svg>'">
                    <span class="item-name">${item.label}</span>
                `;
            }

            slot.innerHTML = inner;
            dom.shortkeysSlots.appendChild(slot);
        }
    }

    function renderAll() {
        renderBag();
        renderContainer();
        renderShortkeys();
        initSortable();
    }

    // ─── Tooltip ──────────────────────────────────────────────
    function showTooltip(e, item) {
        dom.tooltipName.textContent = item.label;
        dom.tooltipDesc.textContent = item.description || '';
        dom.tooltipWeight.textContent = `Weight: ${(item.weight * item.count).toFixed(1)} kg`;
        dom.tooltipQty.textContent = `Qty: ${item.count}`;
        dom.tooltip.classList.remove('hidden');
        moveTooltip(e);
    }

    function moveTooltip(e) {
        const tooltip = dom.tooltip;
        let x = e.clientX + 16;
        let y = e.clientY + 12;

        // Keep on screen
        const rect = tooltip.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - 8;
        if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - 8;

        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }

    function hideTooltip() {
        dom.tooltip.classList.add('hidden');
    }

    // ─── Context Menu ─────────────────────────────────────────
    function showContextMenu(e, item, zone, index) {
        e.preventDefault();
        hideTooltip();
        state.contextTarget = { item, zone, index };

        const menu = dom.contextMenu;
        menu.classList.remove('hidden');

        let x = e.clientX;
        let y = e.clientY;
        // Adjust positioning after render
        requestAnimationFrame(() => {
            const rect = menu.getBoundingClientRect();
            if (x + rect.width > window.innerWidth) x -= rect.width;
            if (y + rect.height > window.innerHeight) y -= rect.height;
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
        });
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    }

    function hideContextMenu() {
        dom.contextMenu.classList.add('hidden');
        state.contextTarget = null;
    }

    // Context menu actions
    dom.contextMenu.addEventListener('click', (e) => {
        const actionEl = e.target.closest('.context-menu-item');
        if (!actionEl || !state.contextTarget) return;

        const action = actionEl.dataset.action;
        const { item, zone, index } = state.contextTarget;

        switch (action) {
            case 'use':
                postNUI('useItem', { item: item.name, slot: index, zone });
                if (isTestMode) {
                    console.log(`✅ Used item: ${item.label}`);
                }
                break;
            case 'drop':
                postNUI('dropItem', { item: item.name, slot: index, zone, count: item.count });
                if (isTestMode) {
                    // Remove from state
                    if (zone === 'bag') {
                        state.bagItems.splice(index, 1);
                    } else if (zone === 'container') {
                        state.containerItems.splice(index, 1);
                    }
                    renderAll();
                    console.log(`🗑️ Dropped item: ${item.label}`);
                }
                break;
            case 'give':
                postNUI('giveItem', { item: item.name, slot: index, zone, count: item.count });
                if (isTestMode) {
                    console.log(`🤝 Gave item: ${item.label}`);
                }
                break;
            case 'shortkey':
                // Find the first empty shortkey slot or prompt
                const emptyIdx = state.shortkeyItems.findIndex(s => s === null);
                if (emptyIdx !== -1) {
                    state.shortkeyItems[emptyIdx] = { ...item };
                    renderShortkeys();
                    initSortableShortkeys();
                    postNUI('setShortkey', { slot: emptyIdx, item: item.name });
                    console.log(`⌨️ Set shortkey ${emptyIdx + 1}: ${item.label}`);
                }
                break;
        }

        hideContextMenu();
    });

    // ─── SortableJS ───────────────────────────────────────────
    let bagSortable, containerSortable, shortkeySortable;

    function getItemsFromGrid(grid) {
        const items = [];
        grid.querySelectorAll('.item-slot').forEach(slot => {
            if (slot.classList.contains('empty')) {
                items.push(null);
            } else {
                const name = slot.dataset.itemName;
                // Find in state
                const found = [...state.bagItems, ...state.containerItems, ...state.shortkeyItems.filter(Boolean)]
                    .find(it => it && it.name === name);
                items.push(found ? { ...found } : null);
            }
        });
        return items;
    }

    function initSortable() {
        // Destroy existing instances
        if (bagSortable) bagSortable.destroy();
        if (containerSortable) containerSortable.destroy();

        const sortableOpts = {
            group: {
                name: 'inventory',
                pull: true,
                put: true,
            },
            animation: 200,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            filter: '.empty',
            swapThreshold: 0.65,
            onAdd: function (evt) {
                const droppedEl = evt.item;
                const itemName = droppedEl.dataset.itemName;
                const toZone = evt.to.id === 'bag-grid' ? 'bag' : 'container';
                let fromZone = evt.from.id === 'bag-grid' ? 'bag' : evt.from.id === 'container-grid' ? 'container' : 'shortkeys';
                if (evt.from.id === 'shortkeys-slots') fromZone = 'shortkeys';

                droppedEl.remove();

                if (!itemName) return renderAll();
                if (!canFitItem(itemName, toZone)) return renderAll();

                if (fromZone === 'shortkeys' && toZone === 'container') {
                    const depleted = moveOneItem(itemName, state.bagItems, state.containerItems);
                    if (depleted) {
                        const skIdx = state.shortkeyItems.findIndex(i => i && i.name === itemName);
                        if (skIdx !== -1) {
                            state.shortkeyItems[skIdx] = null;
                            postNUI('setShortkey', { slot: skIdx, item: null });
                        }
                    }
                    state.lastAction = { fromZone: 'bag', toZone: 'container' };
                    postNUI('moveItem', { fromZone: 'bag', toZone: 'container', item: itemName, count: 1 });

                } else if (fromZone === 'bag' && toZone === 'container') {
                    const depleted = moveOneItem(itemName, state.bagItems, state.containerItems);
                    if (depleted) {
                        const skIdx = state.shortkeyItems.findIndex(i => i && i.name === itemName);
                        if (skIdx !== -1) {
                            state.shortkeyItems[skIdx] = null;
                            postNUI('setShortkey', { slot: skIdx, item: null });
                        }
                    }
                    state.lastAction = { fromZone: 'bag', toZone: 'container' };
                    postNUI('moveItem', { fromZone: 'bag', toZone: 'container', item: itemName, count: 1 });

                } else if (fromZone === 'container' && toZone === 'bag') {
                    moveOneItem(itemName, state.containerItems, state.bagItems);
                    state.lastAction = { fromZone: 'container', toZone: 'bag' };
                    postNUI('moveItem', { fromZone: 'container', toZone: 'bag', item: itemName, count: 1 });

                } else if (fromZone === 'shortkeys' && toZone === 'bag') {
                    const skIdx = evt.oldIndex;
                    if (skIdx !== undefined) {
                        state.shortkeyItems[skIdx] = null;
                        postNUI('setShortkey', { slot: skIdx, item: null });
                    }
                    // No need to send NUI because the item never left the bag
                }

                renderAll();
            },
            onEnd: handleDragEnd,
        };

        bagSortable = new Sortable(dom.bagGrid, { ...sortableOpts, sort: false });
        containerSortable = new Sortable(dom.containerGrid, { ...sortableOpts, sort: false });
        initSortableShortkeys();
    }

    function initSortableShortkeys() {
        if (shortkeySortable) shortkeySortable.destroy();

        shortkeySortable = new Sortable(dom.shortkeysSlots, {
            group: {
                name: 'inventory',
                pull: true,
                put: true,
            },
            animation: 0,
            sort: false,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onStart: function (evt) {
                // When dragging out, Sortable natively removes the element from flex flow.
                // We instantly inject a dummy slot in its exact place so it stays at 6 columns.
                const dummy = document.createElement('div');
                dummy.className = 'shortkey-slot';
                dummy.id = 'drag-dummy-slot';
                dummy.innerHTML = `<span class="shortkey-number">${evt.oldIndex + 1}</span>`;
                dom.shortkeysSlots.insertBefore(dummy, dom.shortkeysSlots.children[evt.oldIndex]);
            },
            onAdd: function (evt) {
                const droppedEl = evt.item;
                const itemName = droppedEl.dataset.itemName;
                const fromZone = evt.from.id === 'bag-grid' ? 'bag' : evt.from.id === 'container-grid' ? 'container' : 'shortkeys';

                let targetIndex = evt.newIndex;
                if (evt.originalEvent) {
                    const e = evt.originalEvent;
                    let cX = e.clientX, cY = e.clientY;
                    if (e.changedTouches?.length > 0) {
                        cX = e.changedTouches[0].clientX;
                        cY = e.changedTouches[0].clientY;
                    }
                    if (cX !== undefined && cY !== undefined) {
                        droppedEl.style.display = 'none';
                        const elemBelow = document.elementFromPoint(cX, cY);
                        droppedEl.style.display = '';

                        if (elemBelow) {
                            const slotBelow = elemBelow.closest('.shortkey-slot');
                            if (slotBelow && slotBelow !== droppedEl) {
                                const allOriginalSlots = Array.from(dom.shortkeysSlots.children).filter(el => el !== droppedEl && el.id !== 'drag-dummy-slot');
                                const foundIdx = allOriginalSlots.indexOf(slotBelow);
                                if (foundIdx !== -1) {
                                    targetIndex = foundIdx;
                                }
                            }
                        }
                    }
                }

                if (targetIndex >= state.shortkeyItems.length) {
                    targetIndex = state.shortkeyItems.length - 1;
                }

                droppedEl.remove();

                if (fromZone === 'container') {
                    return renderAll(); // NOT ALLOWED
                }

                if (itemName && fromZone === 'bag') {
                    const found = state.bagItems.find(i => i && i.name === itemName);
                    if (found) {
                        state.shortkeyItems[targetIndex] = { ...found };
                        postNUI('setShortkey', { slot: targetIndex, item: itemName });
                    }
                }
                renderAll();
            },
            onEnd: function (evt) {
                // Remove the dummy we added in onStart
                const dummy = document.getElementById('drag-dummy-slot');
                if (dummy) dummy.remove();

                renderAll();
            },
        });
    }

    function handleDragEnd(evt) {
        // Only handle same-zone reordering (cross-zone is handled by onAdd)
        if (evt.from === evt.to) {
            rebuildStateFromDOM();
            postNUI('moveItem', {
                fromZone: evt.from.id.replace('-grid', '').replace('-slots', ''),
                toZone: evt.to.id.replace('-grid', '').replace('-slots', ''),
                fromSlot: evt.oldIndex,
                toSlot: evt.newIndex,
            });
        }
        renderAll();
    }

    function rebuildStateFromDOM() {
        state.bagItems = [];
        dom.bagGrid.querySelectorAll('.item-slot').forEach(slot => {
            if (!slot.classList.contains('empty') && slot.dataset.itemName) {
                const itemName = slot.dataset.itemName;
                const allItems = [...MOCK_ITEMS, ...MOCK_CONTAINER,
                { name: 'money_bag', label: 'Money Bag', count: 1, weight: 3.0, description: 'A bag full of cash.' },
                { name: 'gold_bar', label: 'Gold Bar', count: 2, weight: 5.0, description: 'Pure gold bar.' },
                { name: 'diamond', label: 'Diamond', count: 3, weight: 0.1, description: 'A sparkling diamond.' },
                ];
                const found = allItems.find(i => i.name === itemName);
                if (found) state.bagItems.push({ ...found });
            }
        });

        state.containerItems = [];
        dom.containerGrid.querySelectorAll('.item-slot').forEach(slot => {
            if (!slot.classList.contains('empty') && slot.dataset.itemName) {
                const itemName = slot.dataset.itemName;
                const allItems = [...MOCK_ITEMS, ...MOCK_CONTAINER];
                const found = allItems.find(i => i.name === itemName);
                if (found) state.containerItems.push({ ...found });
            }
        });

        const newShortkeys = [null, null, null, null, null, null];
        dom.shortkeysSlots.querySelectorAll('.shortkey-slot').forEach((slot, idx) => {
            if (slot.classList.contains('has-item') && slot.querySelector('.item-image')) {
                const img = slot.querySelector('.item-image');
                const alt = img.alt;
                const allItems = [...MOCK_ITEMS, ...MOCK_CONTAINER];
                const found = allItems.find(i => i.label === alt);
                if (found && idx < 5) newShortkeys[idx] = { ...found };
            }
        });
        state.shortkeyItems = newShortkeys;
    }

    // ─── Open / Close ─────────────────────────────────────────
    function openInventory(data) {
        if (data) {
            state.bagItems = (data.inventory || []).filter(i => i && i.count > 0);
            state.containerItems = data.container || [];
            state.maxWeight = data.maxWeight || 40;
            state.containerMaxWeight = data.containerMaxWeight || 15;

            if (data.playerName) dom.playerName.textContent = data.playerName;
            if (data.playerId) dom.playerId.textContent = 'ID: ' + data.playerId;
        }

        state.isOpen = true;
        dom.container.classList.remove('hidden');
        renderAll();
    }

    function closeInventory() {
        state.isOpen = false;
        state.lastAction = null;
        dom.container.classList.add('hidden');
        hideContextMenu();
        hideTooltip();
        postNUI('closeInventory');
    }

    // ─── Event Listeners ──────────────────────────────────────

    // NUI messages from Lua
    window.addEventListener('message', (event) => {
        const data = event.data;

        switch (data.action) {
            case 'openInventory':
                openInventory(data);
                break;
            case 'closeInventory':
                closeInventory();
                break;
            case 'updateInventory':
                state.bagItems = (data.inventory || []).filter(i => i && i.count > 0);
                renderBag();
                break;
        }
    });

    // ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.isOpen) {
            e.preventDefault();
            closeInventory();
        }
    });

    // Click outside to close context menu
    document.addEventListener('click', (e) => {
        if (!dom.contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });

    // ─── Test Mode Bootstrap ──────────────────────────────────
    if (isTestMode) {
        console.log('%c🎮 ESX Inventory – Test Mode', 'color: #e53935; font-size: 16px; font-weight: bold;');
        console.log('%cPress [TAB] or click the button to toggle inventory', 'color: #9e9e9e;');

        // Create toggle button for test mode
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'test-toggle';
        toggleBtn.innerHTML = '📦 Toggle Inventory (TAB)';
        toggleBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            padding: 12px 24px;
            background: #e53935;
            color: white;
            border: none;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(229, 57, 53, 0.3);
            transition: all 0.2s ease;
        `;
        toggleBtn.addEventListener('mouseenter', () => {
            toggleBtn.style.transform = 'scale(1.05)';
            toggleBtn.style.boxShadow = '0 6px 24px rgba(229, 57, 53, 0.5)';
        });
        toggleBtn.addEventListener('mouseleave', () => {
            toggleBtn.style.transform = 'scale(1)';
            toggleBtn.style.boxShadow = '0 4px 16px rgba(229, 57, 53, 0.3)';
        });
        toggleBtn.addEventListener('click', () => {
            if (state.isOpen) {
                closeInventory();
            } else {
                openInventory({
                    inventory: MOCK_ITEMS,
                    container: MOCK_CONTAINER,
                    maxWeight: 40,
                    playerName: 'John Doe',
                    playerId: 42,
                });
            }
        });
        document.body.appendChild(toggleBtn);

        // TAB key toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                toggleBtn.click();
            }
        });

        // Background for test mode
        document.body.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
        document.body.style.backgroundSize = 'cover';
        document.body.style.minHeight = '100vh';
    }

    // Expose for external use
    window.ESXInventory = {
        open: openInventory,
        close: closeInventory,
        state: state,
    };
})();
