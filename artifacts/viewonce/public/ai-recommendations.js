// AI Recommendations System
class AIRecommendations {
    constructor() {
        this.userPreferences = {
            priceRange: { min: 0, max: 50000 },
            locations: [],
            propertyTypes: [],
            amenities: [],
            seasonalPreferences: {},
            ratingThreshold: 4.0
        };
        this.loadUserData();
    }

    // Load user data from store
    loadUserData() {
        if (typeof store !== 'undefined') {
            this.analyzeUserBehavior();
        }
    }

    // Analyze user behavior from bookings and wishlist
    analyzeUserBehavior() {
        const bookings = store.state.bookings || [];
        const wishlist = store.state.wishlist || [];

        if (bookings.length === 0 && wishlist.length === 0) {
            return; // No data to analyze
        }

        // Analyze price preferences
        const allProperties = [...bookings, ...wishlist];
        if (allProperties.length > 0) {
            const prices = allProperties.map(p => p.price || p.totalPrice || 0).filter(p => p > 0);
            if (prices.length > 0) {
                const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
                const stdDev = Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - avgPrice, 2), 0) / prices.length);

                this.userPreferences.priceRange = {
                    min: Math.max(0, avgPrice - stdDev),
                    max: avgPrice + stdDev
                };
            }
        }

        // Analyze location preferences
        const locations = allProperties
            .map(p => p.location || p.property?.location)
            .filter(loc => loc)
            .reduce((acc, loc) => {
                acc[loc] = (acc[loc] || 0) + 1;
                return acc;
            }, {});

        this.userPreferences.locations = Object.entries(locations)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([location]) => location);

        // Analyze property types
        const propertyTypes = allProperties
            .map(p => this.extractPropertyType(p.title || p.property?.title || ''))
            .filter(type => type)
            .reduce((acc, type) => {
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});

        this.userPreferences.propertyTypes = Object.entries(propertyTypes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2)
            .map(([type]) => type);

        // Analyze amenities
        const amenities = allProperties
            .flatMap(p => p.amenities || [])
            .reduce((acc, amenity) => {
                acc[amenity] = (acc[amenity] || 0) + 1;
                return acc;
            }, {});

        this.userPreferences.amenities = Object.entries(amenities)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([amenity]) => amenity);

        // Analyze seasonal preferences
        this.analyzeSeasonalPreferences(bookings);
    }

    // Extract property type from title
    extractPropertyType(title) {
        const titleLower = title.toLowerCase();
        if (titleLower.includes('apartment') || titleLower.includes('flat')) return 'apartment';
        if (titleLower.includes('house') || titleLower.includes('home')) return 'house';
        if (titleLower.includes('villa')) return 'villa';
        if (titleLower.includes('cottage') || titleLower.includes('cabin')) return 'cottage';
        if (titleLower.includes('loft')) return 'loft';
        if (titleLower.includes('penthouse')) return 'penthouse';
        if (titleLower.includes('bungalow')) return 'bungalow';
        if (titleLower.includes('condo')) return 'condo';
        return 'other';
    }

    // Analyze seasonal booking preferences
    analyzeSeasonalPreferences(bookings) {
        const monthlyBookings = {};

        bookings.forEach(booking => {
            const checkinDate = new Date(booking.checkin || booking.checkIn);
            if (!isNaN(checkinDate.getTime())) {
                const month = checkinDate.getMonth();
                monthlyBookings[month] = (monthlyBookings[month] || 0) + 1;
            }
        });

        // Find preferred months
        const sortedMonths = Object.entries(monthlyBookings)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        this.userPreferences.seasonalPreferences = {
            preferredMonths: sortedMonths.map(([month]) => parseInt(month)),
            bookingFrequency: Object.values(monthlyBookings).reduce((a, b) => a + b, 0) / 12
        };
    }

    // Generate personalized recommendations
    generateRecommendations(properties, limit = 6) {
        if (!properties || properties.length === 0) return [];

        let scoredProperties = properties.map(property => ({
            ...property,
            score: this.calculateRecommendationScore(property)
        }));

        // Sort by score and return top recommendations
        return scoredProperties
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    // Calculate recommendation score for a property
    calculateRecommendationScore(property) {
        let score = 0;
        const maxScore = 100;

        // Price match (30 points)
        const price = property.price || 0;
        if (price >= this.userPreferences.priceRange.min && price <= this.userPreferences.priceRange.max) {
            score += 30;
        } else if (price > this.userPreferences.priceRange.max * 1.5) {
            score -= 15; // Penalty for being too expensive
        }

        // Location preference (25 points)
        if (this.userPreferences.locations.includes(property.location)) {
            score += 25;
        }

        // Property type match (15 points)
        const propertyType = this.extractPropertyType(property.title);
        if (this.userPreferences.propertyTypes.includes(propertyType)) {
            score += 15;
        }

        // Amenities match (15 points)
        const matchingAmenities = (property.amenities || []).filter(amenity =>
            this.userPreferences.amenities.includes(amenity)
        ).length;
        score += (matchingAmenities / Math.max(this.userPreferences.amenities.length, 1)) * 15;

        // Rating bonus (10 points)
        const rating = property.rating || 0;
        if (rating >= this.userPreferences.ratingThreshold) {
            score += (rating / 5) * 10;
        }

        // Popularity bonus (5 points)
        if (property.popular || property.featured) {
            score += 5;
        }

        return Math.min(maxScore, Math.max(0, score));
    }

    // Generate AI suggestions text
    generateAISuggestions() {
        const suggestions = [];

        // Price-based suggestions
        if (this.userPreferences.priceRange.max < 10000) {
            suggestions.push({
                icon: '💰',
                title: 'Budget-Friendly Options',
                text: 'Based on your preferences, you might like our affordable stays under Ksh 10,000/night'
            });
        } else if (this.userPreferences.priceRange.min > 15000) {
            suggestions.push({
                icon: '🏆',
                title: 'Luxury Recommendations',
                text: 'Consider our premium properties for a more luxurious experience'
            });
        }

        // Location-based suggestions
        if (this.userPreferences.locations.length > 0) {
            const topLocation = this.userPreferences.locations[0];
            suggestions.push({
                icon: '📍',
                title: 'Your Favorite Area',
                text: `More amazing stays available in ${topLocation} - your preferred destination!`
            });
        }

        // Seasonal suggestions
        const currentMonth = new Date().getMonth();
        if (this.userPreferences.seasonalPreferences.preferredMonths?.includes(currentMonth)) {
            suggestions.push({
                icon: '📅',
                title: 'Perfect Timing',
                text: 'This is one of your preferred months for travel - great choice!'
            });
        }

        // Amenity-based suggestions
        if (this.userPreferences.amenities.includes('pool')) {
            suggestions.push({
                icon: '🏊',
                title: 'Pool Paradise',
                text: 'Properties with pools are trending - perfect for relaxation!'
            });
        }

        if (this.userPreferences.amenities.includes('wifi')) {
            suggestions.push({
                icon: '📶',
                title: 'Stay Connected',
                text: 'High-speed WiFi available in all recommended properties'
            });
        }

        // Default suggestions if no specific preferences
        if (suggestions.length === 0) {
            suggestions.push(
                {
                    icon: '⭐',
                    title: 'Highly Rated',
                    text: 'Check out our 4.8+ star properties for exceptional stays'
                },
                {
                    icon: '🔥',
                    title: 'Trending Now',
                    text: 'Popular properties in Nairobi are booking fast!'
                },
                {
                    icon: '💡',
                    title: 'Smart Savings',
                    text: 'Book 7+ nights and save 10% on your stay'
                }
            );
        }

        return suggestions.slice(0, 3); // Return top 3 suggestions
    }

    // Get trending properties
    getTrendingProperties() {
        if (typeof store !== 'undefined' && store.state.properties) {
            // Return top rated active properties from the store
            return store.state.properties
                .filter(p => p.status === 'active')
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 3);
        }
        return [];
    }

    // Get personalized search suggestions
    getSearchSuggestions() {
        const suggestions = [];

        if (this.userPreferences.locations.length > 0) {
            suggestions.push(`Stays in ${this.userPreferences.locations[0]}`);
        }

        if (this.userPreferences.propertyTypes.length > 0) {
            suggestions.push(`${this.userPreferences.propertyTypes[0]}s with great reviews`);
        }

        if (this.userPreferences.priceRange.max < 10000) {
            suggestions.push('Budget-friendly stays under Ksh 10,000');
        }

        if (this.userPreferences.amenities.includes('pool')) {
            suggestions.push('Properties with swimming pools');
        }

        // Default suggestions
        if (suggestions.length === 0) {
            suggestions.push(
                'Luxury apartments in Nairobi',
                'Beachfront properties in Mombasa',
                'Mountain retreats in Aberdare',
                'Budget stays for families'
            );
        }

        return suggestions.slice(0, 4);
    }

    // Update preferences based on new booking
    updatePreferencesFromBooking(booking) {
        // This would be called when a new booking is made
        // to continuously learn from user behavior
        setTimeout(() => {
            this.loadUserData();
        }, 1000);
    }
}

// Create global AI recommendations instance
const aiRecommendations = new AIRecommendations();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = aiRecommendations;
}
