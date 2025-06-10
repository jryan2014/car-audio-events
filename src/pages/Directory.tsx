import React, { useState } from 'react';
import { Search, MapPin, Phone, Globe, Star, Filter, Building, Wrench } from 'lucide-react';

export default function Directory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const listings = [
    {
      id: 1,
      name: "Sound Solutions Audio",
      type: "Retailer",
      location: "Orlando, FL",
      phone: "+1 (407) 555-0123",
      website: "https://soundsolutions.com",
      rating: 4.8,
      reviews: 124,
      image: "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2",
      description: "Premier car audio installation and retail shop with 15+ years of experience.",
      specialties: ["Installation", "Custom Builds", "Sound Quality", "SPL Systems"],
      featured: true
    },
    {
      id: 2,
      name: "Bass Monsters Inc",
      type: "Manufacturer",
      location: "Phoenix, AZ",
      phone: "+1 (602) 555-0456",
      website: "https://bassmonsters.com",
      rating: 4.6,
      reviews: 89,
      image: "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2",
      description: "Leading manufacturer of high-performance subwoofers and amplifiers.",
      specialties: ["Subwoofers", "Amplifiers", "Competition Grade", "Custom Design"],
      featured: false
    },
    {
      id: 3,
      name: "Elite Audio Works",
      type: "Retailer",
      location: "Atlanta, GA",
      phone: "+1 (404) 555-0789",
      website: "https://eliteaudioworks.com",
      rating: 4.9,
      reviews: 156,
      image: "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2",
      description: "Award-winning custom installation shop specializing in luxury vehicles.",
      specialties: ["Luxury Installs", "Sound Deadening", "Custom Fabrication", "Integration"],
      featured: true
    },
    {
      id: 4,
      name: "Thunder Audio Systems",
      type: "Manufacturer",
      location: "Dallas, TX",
      phone: "+1 (214) 555-0321",
      website: "https://thunderaudio.com",
      rating: 4.7,
      reviews: 67,
      image: "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2",
      description: "Innovative manufacturer of competition-grade audio components.",
      specialties: ["Competition Audio", "High Power", "Digital Processing", "Research & Development"],
      featured: false
    },
    {
      id: 5,
      name: "Sonic Perfection",
      type: "Retailer",
      location: "Las Vegas, NV",
      phone: "+1 (702) 555-0654",
      website: "https://sonicperfection.com",
      rating: 4.5,
      reviews: 203,
      image: "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2",
      description: "Full-service car audio shop with nationwide shipping and installation.",
      specialties: ["Online Sales", "Installation", "Tuning", "Consultation"],
      featured: true
    },
    {
      id: 6,
      name: "Precision Audio Labs",
      type: "Manufacturer",
      location: "Miami, FL",
      phone: "+1 (305) 555-0987",
      website: "https://precisionaudiolabs.com",
      rating: 4.8,
      reviews: 45,
      image: "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2",
      description: "Boutique manufacturer of premium sound quality components.",
      specialties: ["Sound Quality", "Premium Components", "Limited Edition", "Audiophile Grade"],
      featured: false
    }
  ];

  const types = ['all', 'Retailer', 'Manufacturer'];
  const locations = ['all', 'Orlando, FL', 'Phoenix, AZ', 'Atlanta, GA', 'Dallas, TX', 'Las Vegas, NV', 'Miami, FL'];

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.specialties.some(specialty => specialty.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'all' || listing.type === selectedType;
    const matchesLocation = selectedLocation === 'all' || listing.location === selectedLocation;
    
    return matchesSearch && matchesType && matchesLocation;
  });

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-6">
            Business <span className="text-electric-400">Directory</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Connect with trusted retailers, manufacturers, and service providers in the car audio industry
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                {types.map(type => (
                  <option key={type} value={type} className="bg-gray-800">
                    {type === 'all' ? 'All Types' : type}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                {locations.map(location => (
                  <option key={location} value={location} className="bg-gray-800">
                    {location === 'all' ? 'All Locations' : location}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-400">
            Showing <span className="text-white font-semibold">{filteredListings.length}</span> businesses
          </p>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredListings.map((listing, index) => (
            <div 
              key={listing.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl hover:shadow-electric-500/10 transition-all duration-300 hover:scale-105 border border-gray-700/50 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative">
                <img 
                  src={listing.image} 
                  alt={listing.name}
                  className="w-full h-48 object-cover"
                />
                {listing.featured && (
                  <div className="absolute top-4 left-4 bg-electric-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                    <Star className="h-3 w-3" />
                    <span>Featured</span>
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                  {listing.type === 'Retailer' ? <Building className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                  <span>{listing.type}</span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                  {listing.name}
                </h3>
                
                <div className="flex items-center space-x-1 mb-3">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${i < Math.floor(listing.rating) ? 'text-yellow-500 fill-current' : 'text-gray-600'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-yellow-500 font-semibold text-sm">{listing.rating}</span>
                  <span className="text-gray-400 text-sm">({listing.reviews} reviews)</span>
                </div>

                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  {listing.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-400 text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-electric-500" />
                    {listing.location}
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Phone className="h-4 w-4 mr-2 text-electric-500" />
                    {listing.phone}
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Globe className="h-4 w-4 mr-2 text-electric-500" />
                    <a href={listing.website} className="text-electric-400 hover:text-electric-300 transition-colors">
                      Visit Website
                    </a>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-white font-medium text-sm mb-2">Specialties:</div>
                  <div className="flex flex-wrap gap-1">
                    {listing.specialties.slice(0, 3).map((specialty, index) => (
                      <span 
                        key={index}
                        className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs"
                      >
                        {specialty}
                      </span>
                    ))}
                    {listing.specialties.length > 3 && (
                      <span className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs">
                        +{listing.specialties.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <button className="w-full bg-electric-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-electric-600 transition-all duration-200 text-sm">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredListings.length === 0 && (
          <div className="text-center py-12">
            <Building className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No businesses found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}