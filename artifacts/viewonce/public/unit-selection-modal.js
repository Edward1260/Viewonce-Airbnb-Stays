/**
 * Unit Selection Modal Component
 * Fetches and displays available units for a building using api.getPropertyDetails
 */

const UnitSelectionModal = {
    modalId: 'unit-selection-modal',
    onUnitSelected: null,

    init() {
        if (typeof window.uiComponents === 'undefined' || !window.uiComponents.modalManager) {
            console.error('ui-components.js must be loaded before unit-selection-modal.js');
            return;
        }

        window.uiComponents.modalManager.create(this.modalId, {
            title: 'Select your Space',
            width: '600px'
        });

        window.uiComponents.modalManager.create('unit-gallery-modal', {
            title: 'Room Gallery',
            width: '800px'
        });
    },

    /**
     * Opens the modal for a specific building
     * @param {string} buildingId - The ID of the property/building
     * @param {function} callback - Callback function receiving the selected unit
     */
    async open(buildingId, callback) {
        this.onUnitSelected = callback;
        const body = window.uiComponents.modalManager.getBody(this.modalId);
        
        // Show loading skeleton
        body.innerHTML = `
            <div class="flex flex-col items-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                <p class="text-gray-500 font-medium">Scanning for available rooms...</p>
            </div>
        `;
        
        window.uiComponents.modalManager.open(this.modalId);

        try {
            const property = await window.api.getPropertyDetails(buildingId);
            this.render(property);
        } catch (error) {
            body.innerHTML = `
                <div class="text-center py-8">
                    <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-exclamation-triangle text-2xl"></i>
                    </div>
                    <p class="text-gray-800 font-bold text-lg">Unable to fetch units</p>
                    <p class="text-gray-500 text-sm mt-2">${error.message}</p>
                    <button onclick="window.uiComponents.modalManager.close('${this.modalId}')" class="mt-6 px-8 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors">Close</button>
                </div>
            `;
        }
    },

    render(property) {
        const body = window.uiComponents.modalManager.getBody(this.modalId);
        const units = property.units || [];
        
        if (units.length === 0) {
            body.innerHTML = `
                <div class="text-center py-8">
                    <h3 class="text-xl font-bold text-gray-800 mb-2">${property.title}</h3>
                    <p class="text-gray-500">This property does not have individual units available for selection.</p>
                    <button onclick="window.uiComponents.modalManager.close('${this.modalId}')" class="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">Close</button>
                </div>
            `;
            return;
        }

        body.innerHTML = `
            <div class="mb-6 p-4 bg-indigo-50 rounded-2xl">
                <h3 class="text-xl font-bold text-indigo-900">${property.title}</h3>
                <p class="text-indigo-600 text-sm flex items-center mt-1"><i class="fas fa-map-marker-alt mr-2"></i> ${property.location}</p>
            </div>
            
            <div class="grid gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                ${units.map(unit => `
                    <div class="p-5 border-2 border-gray-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer group" onclick="window.UnitSelectionModal.selectUnit('${unit.id}', '${unit.name}')">
                        <div class="flex gap-5 items-start">
                            <div class="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                                <img src="${unit.images?.[0] || unit.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300'}" 
                                     alt="${unit.name}" 
                                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                     onerror="this.src='https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300'">
                            </div>
                            <div class="flex-1">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <div class="flex items-center gap-3 mb-2">
                                            <h4 class="font-bold text-gray-900 text-lg group-hover:text-indigo-700">${unit.name}</h4>
                                            <span class="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold uppercase tracking-wider">Instant Book</span>
                                        </div>
                                        <div class="flex gap-4 text-sm text-gray-600">
                                            <span class="flex items-center"><i class="fas fa-user-friends mr-2 text-indigo-400"></i> ${unit.maxGuests || 2} Guests</span>
                                            <span class="flex items-center"><i class="fas fa-bed mr-2 text-indigo-400"></i> ${unit.beds || 1} Beds</span>
                                        </div>
                                        <button onclick="event.stopPropagation(); window.UnitSelectionModal.openGallery('${unit.id}', '${unit.name}', ${JSON.stringify(unit.images || []).replace(/"/g, '&quot;')})" 
                                                class="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors py-1.5 px-3 bg-indigo-50 rounded-lg">
                                            <i class="fas fa-images"></i> Quick View
                                        </button>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-xl font-extrabold text-indigo-600">KSh ${parseInt(unit.price).toLocaleString()}</div>
                                        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Per Night</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Opens a larger gallery modal for a specific unit
     */
    openGallery(unitId, unitName, images) {
        const body = window.uiComponents.modalManager.getBody('unit-gallery-modal');
        const galleryImages = images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'];
        
        body.innerHTML = `
            <div class="mb-6">
                <h4 class="text-2xl font-bold text-gray-900">${unitName}</h4>
                <p class="text-gray-500 text-sm">Previewing all available photos for this room.</p>
            </div>
            <div class="grid grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                ${galleryImages.map(img => `
                    <div class="rounded-2xl overflow-hidden h-56 bg-gray-100 shadow-sm border border-gray-100">
                        <img src="${img}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-700">
                    </div>
                `).join('')}
            </div>
        `;
        window.uiComponents.modalManager.open('unit-gallery-modal');
    },

    selectUnit(unitId, unitName) {
        if (this.onUnitSelected) {
            this.onUnitSelected({ id: unitId, name: unitName });
        }
        window.uiComponents.toast.success(`Room selected: ${unitName}`);
        window.uiComponents.modalManager.close(this.modalId);
    }
};

// Initialize component
document.addEventListener('DOMContentLoaded', () => UnitSelectionModal.init());
window.UnitSelectionModal = UnitSelectionModal;