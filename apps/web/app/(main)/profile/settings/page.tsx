'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Card, CardBody, Input, Button, Switch } from '@nextui-org/react';
import { User, Upload, Send, MapPin, Compass, IdCard, CreditCard, Bell, CheckCircle, Heart, Utensils, Globe, Star, PlaneTakeoff, Car, ChevronDown, ChevronUp } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import Image from 'next/image';

export default function ProfileSettings() {
  const [selectedTab, setSelectedTab] = useState('personal');
  const [selectedPreferenceSubTab, setSelectedPreferenceSubTab] = useState('general');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [openPersonalSections, setOpenPersonalSections] = useState({
    personalInfo: true,
    contactInfo: true,
  });
  const [openHotelSections, setOpenHotelSections] = useState({
    quality: true,
    roomDetails: true,
    chains: true,
  });
  const [openGeneralSections, setOpenGeneralSections] = useState({
    interests: true,
    language: true,
    accessibility: true,
    travelStyle: true,
    specialNeeds: true,
  });
  const [openFlightSections, setOpenFlightSections] = useState({
    seating: true,
    stops: true,
    departureTime: true,
    airlines: true,
  });
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '01/15/1990',
    nationality: 'NA',
    passportNumber: 'P1234567',
    passportExpiry: '12/31/2030',
    securityCode: '',
    email: 'John@gmail.com',
    contactNumber: '+8801567890',
    residenceAddress: 'United state',
    emergencyContact: 'John',
  });

  const [paymentData, setPaymentData] = useState({
    cardNumber: '•••• •••• •••• ••••',
    cardholderName: '',
    expiryDate: '',
    securityCode: '•••',
    billingAddress: '',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: true,
    marketingEmails: false,
    tripUpdates: true,
    reminderNotifications: false,
  });

  const [preferences, setPreferences] = useState({
    adventure: true,
    nightlife: false,
    museums: true,
    beaches: true,
    shopping: false,
    foodTours: true,
    relaxation: true,
    luxury: false,
    budget: true,
    photography: true,
    localCulture: true,
    english: true,
    spanish: false,
    french: false,
    german: false,
    italian: false,
    portuguese: false,
    mandarin: false,
    japanese: false,
    arabic: false,
    // Accessibility
    wheelchairAccessible: false,
    visualImpairment: false,
    hearingImpairment: false,
    mobilityAssistance: false,
    withInfants: false,
    seniorFriendly: false,
    // Travel Style
    soloTraveler: false,
    couple: true,
    familyWithKids: false,
    groupTravel: false,
    businessTravel: false,
    // Special Needs
    travelingWithPets: false,
    nonSmoking: true,
    quietEnvironment: false,
    ecoFriendly: true,
  });

  const [diningPreferences, setDiningPreferences] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    dairyFree: false,
    nutAllergy: false,
    halal: false,
    kosher: false,
    seafoodAllergy: false,
    spicyFood: true,
    organicFood: false,
  });

  const [flightPreferences, setFlightPreferences] = useState({
    windowSeat: true,
    aisleSeat: false,
    extraLegroom: true,
    directFlightsOnly: false,
    multipleStopsOk: true,
    budgetAirlines: true,
    premiumAirlines: false,
    earlyMorning: false,
    lateMorning: true,
    afternoon: true,
    evening: false,
    delta: false,
    american: false,
    united: false,
    southwest: false,
    jetblue: false,
    alaska: false,
    spirit: false,
    frontier: false,
    preferredAirport: 'JFK',
  });

  const [accommodationPreferences, setAccommodationPreferences] = useState({
    fiveStarOnly: false,
    fourStarPlus: true,
    budgetFriendly: false,
    freeBreakfast: true,
    freeWiFi: true,
    gym: true,
    pool: true,
    spa: false,
    parking: false,
    petFriendly: false,
    marriott: false,
    hilton: false,
    hyatt: false,
    ihg: false,
    accor: false,
    wyndham: false,
    choiceHotels: false,
    bestWestern: false,
    airbnb: true,
    vrbo: false,
    // Room Details
    oneRoomOneBed: false,
    oneRoomTwoBeds: true,
    twoRooms: false,
    suite: false,
    luxuryRoom: false,
    penthouse: false,
    connectingRooms: false,
    adjoiningRooms: true,
    adjacentRooms: false,
  });



  const [carRentalPreferences, setCarRentalPreferences] = useState({
    compactCar: false,
    sedanCar: true,
    suvCar: false,
    luxuryCar: false,
    vanMinibus: false,
    automaticTransmission: true,
    manualTransmission: false,
    electricVehicle: false,
    hybridVehicle: false,
    gpsNavigation: true,
    unlimitedMileage: true,
    fullInsurance: true,
    additionalDriver: false,
    childSeat: false,
    airportPickup: true,
  });

  const handlePhotoUpload = () => {
    const mockPhotoUrl = 'https://i.pravatar.cc/300';
    setProfilePhoto(mockPhotoUrl);
  };

  const handlePhotoRemove = () => {
    setProfilePhoto(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentChange = (field: string, value: string) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationToggle = (field: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceToggle = (field: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleDiningPreferenceToggle = (field: string, value: boolean) => {
    setDiningPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleFlightPreferenceToggle = (field: string, value: boolean | string) => {
    setFlightPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleAccommodationPreferenceToggle = (field: string, value: boolean) => {
    setAccommodationPreferences(prev => ({ ...prev, [field]: value }));
  };



  const handleCarRentalPreferenceToggle = (field: string, value: boolean) => {
    setCarRentalPreferences(prev => ({ ...prev, [field]: value }));
  };

  const toggleHotelSection = (section: 'quality' | 'roomDetails' | 'chains') => {
    setOpenHotelSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleGeneralSection = (section: 'interests' | 'language' | 'accessibility' | 'travelStyle' | 'specialNeeds') => {
    setOpenGeneralSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleFlightSection = (section: 'seating' | 'stops' | 'departureTime' | 'airlines') => {
    setOpenFlightSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Helper functions to get selected items for each section
  const getSelectedItems = (sectionName: string) => {
    const sectionMappings: { [key: string]: { state: any; keys: string[]; labels: { [key: string]: string } } } = {
      interests: {
        state: preferences,
        keys: ['adventure', 'nightlife', 'museums', 'beaches', 'shopping', 'foodTours', 'relaxation', 'luxury', 'budget', 'photography', 'localCulture'],
        labels: {
          adventure: 'Adventure',
          nightlife: 'Nightlife',
          museums: 'Museums',
          beaches: 'Beaches',
          shopping: 'Shopping',
          foodTours: 'Food Tours',
          relaxation: 'Relaxation',
          luxury: 'Luxury',
          budget: 'Budget-Friendly',
          photography: 'Photography',
          localCulture: 'Local Culture',
        }
      },
      language: {
        state: preferences,
        keys: ['english', 'spanish', 'french', 'german', 'italian', 'portuguese', 'mandarin', 'japanese', 'arabic'],
        labels: {
          english: 'English',
          spanish: 'Spanish',
          french: 'French',
          german: 'German',
          italian: 'Italian',
          portuguese: 'Portuguese',
          mandarin: 'Mandarin',
          japanese: 'Japanese',
          arabic: 'Arabic',
        }
      },
      accessibility: {
        state: preferences,
        keys: ['wheelchairAccessible', 'visualImpairment', 'hearingImpairment', 'mobilityAssistance', 'withInfants', 'seniorFriendly'],
        labels: {
          wheelchairAccessible: 'Wheelchair',
          visualImpairment: 'Visual',
          hearingImpairment: 'Hearing',
          mobilityAssistance: 'Mobility',
          withInfants: 'Infants',
          seniorFriendly: 'Senior',
        }
      },
      travelStyle: {
        state: preferences,
        keys: ['soloTraveler', 'couple', 'familyWithKids', 'groupTravel', 'businessTravel'],
        labels: {
          soloTraveler: 'Solo',
          couple: 'Couple',
          familyWithKids: 'Family',
          groupTravel: 'Group',
          businessTravel: 'Business',
        }
      },
      specialNeeds: {
        state: preferences,
        keys: ['travelingWithPets', 'nonSmoking', 'quietEnvironment', 'ecoFriendly'],
        labels: {
          travelingWithPets: 'Pets',
          nonSmoking: 'Non-Smoking',
          quietEnvironment: 'Quiet',
          ecoFriendly: 'Eco-Friendly',
        }
      },
      seating: {
        state: flightPreferences,
        keys: ['windowSeat', 'aisleSeat', 'extraLegroom', 'budgetAirlines', 'premiumAirlines'],
        labels: {
          windowSeat: 'Window',
          aisleSeat: 'Aisle',
          extraLegroom: 'Extra Legroom',
          budgetAirlines: 'Budget',
          premiumAirlines: 'Premium',
        }
      },
      stops: {
        state: flightPreferences,
        keys: ['directFlightsOnly', 'multipleStopsOk'],
        labels: {
          directFlightsOnly: 'Direct Only',
          multipleStopsOk: 'Multiple Stops',
        }
      },
      departureTime: {
        state: flightPreferences,
        keys: ['earlyMorning', 'lateMorning', 'afternoon', 'evening'],
        labels: {
          earlyMorning: 'Early Morning',
          lateMorning: 'Late Morning',
          afternoon: 'Afternoon',
          evening: 'Evening',
        }
      },
      airlines: {
        state: flightPreferences,
        keys: ['delta', 'american', 'united', 'southwest', 'jetblue', 'alaska', 'spirit', 'frontier'],
        labels: {
          delta: 'Delta',
          american: 'American',
          united: 'United',
          southwest: 'Southwest',
          jetblue: 'JetBlue',
          alaska: 'Alaska',
          spirit: 'Spirit',
          frontier: 'Frontier',
        }
      },
      quality: {
        state: accommodationPreferences,
        keys: ['fiveStarOnly', 'fourStarPlus', 'budgetFriendly', 'freeBreakfast', 'freeWiFi', 'gym', 'pool', 'spa', 'parking', 'petFriendly'],
        labels: {
          fiveStarOnly: '5-Star',
          fourStarPlus: '4-Star+',
          budgetFriendly: 'Budget',
          freeBreakfast: 'Breakfast',
          freeWiFi: 'WiFi',
          gym: 'Gym',
          pool: 'Pool',
          spa: 'Spa',
          parking: 'Parking',
          petFriendly: 'Pet-Friendly',
        }
      },
      roomDetails: {
        state: accommodationPreferences,
        keys: ['oneRoomOneBed', 'oneRoomTwoBeds', 'twoRooms', 'suite', 'luxuryRoom', 'penthouse', 'connectingRooms', 'adjoiningRooms', 'adjacentRooms'],
        labels: {
          oneRoomOneBed: '1 Room 1 Bed',
          oneRoomTwoBeds: '1 Room 2 Beds',
          twoRooms: '2 Rooms',
          suite: 'Suite',
          luxuryRoom: 'Luxury',
          penthouse: 'Penthouse',
          connectingRooms: 'Connecting',
          adjoiningRooms: 'Adjoining',
          adjacentRooms: 'Adjacent',
        }
      },
      chains: {
        state: accommodationPreferences,
        keys: ['marriott', 'hilton', 'hyatt', 'ihg', 'accor', 'wyndham', 'choiceHotels', 'bestWestern', 'airbnb', 'vrbo'],
        labels: {
          marriott: 'Marriott',
          hilton: 'Hilton',
          hyatt: 'Hyatt',
          ihg: 'IHG',
          accor: 'Accor',
          wyndham: 'Wyndham',
          choiceHotels: 'Choice',
          bestWestern: 'Best Western',
          airbnb: 'Airbnb',
          vrbo: 'Vrbo',
        }
      },
    };

    const section = sectionMappings[sectionName];
    if (!section) return [];

    return section.keys
      .filter(key => section.state[key])
      .map(key => section.labels[key]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] via-[#e8eef5] to-[#dce4ec]">

      {/* Main Content Area */}
      <div className="p-4 md:p-8 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="hidden md:block absolute top-20 left-10 opacity-5 rotate-12">
          {/* Replace Plane icon with: */ }
            <Image 
                src="/icons/plane-icon.png" 
                alt="Plane" 
                width={16} 
                height={16}
                className="w-3 h-3 md:w-4 md:h-4"
            />
        </div>
        <div className="hidden md:block absolute bottom-20 right-10 opacity-5 -rotate-12">
          <Compass className="w-40 h-40 text-[#3b82f6]" />
        </div>

      {/* Passport Card */}
      <Card className="max-w-6xl mx-auto shadow-2xl relative z-10 overflow-hidden border-2 md:border-4 border-[#2c5aa0] rounded-3xl">
        {/* Blue Header */}
        <div className="bg-[#2c5aa0] px-4 py-2 md:px-6 md:py-3">
          <h1 className="text-2xl md:text-4xl tracking-[0.2em] font-bold bg-gradient-to-r from-white to-[#dbeafe] bg-clip-text text-transparent">SETTINGS</h1>
        </div>

        <CardBody className="bg-gradient-to-br from-[#fef9ed] via-[#fef5e7] to-[#fef3e2] p-0">
          {/* Custom Tabs */}
          <div className="bg-transparent px-2 md:px-8 pt-4 md:pt-6 pb-0 border-b-2 border-[#3b82f6]">
            <div className="flex gap-1 md:gap-2 overflow-x-auto">
              <button
                className={`px-3 md:px-6 py-2 md:py-3 rounded-t-lg transition-all flex items-center gap-1 md:gap-2 text-xs md:text-base whitespace-nowrap ${
                  selectedTab === 'personal'
                    ? 'bg-[#3b82f6] text-white font-semibold shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTab('personal')}
              >
                <IdCard size={18} className="md:w-[18px] md:h-[18px]" />
                <span className="hidden md:inline">Personal Details</span>
              </button>
              <button
                className={`px-3 md:px-6 py-2 md:py-3 rounded-t-lg transition-all flex items-center gap-1 md:gap-2 text-xs md:text-base whitespace-nowrap ${
                  selectedTab === 'payment'
                    ? 'bg-[#3b82f6] text-white font-semibold shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTab('payment')}
              >
                <CreditCard size={18} className="md:w-[18px] md:h-[18px]" />
                <span className="hidden md:inline">Payment Details</span>
              </button>
              <button
                className={`px-3 md:px-6 py-2 md:py-3 rounded-t-lg transition-all flex items-center gap-1 md:gap-2 text-xs md:text-base whitespace-nowrap ${
                  selectedTab === 'alerts'
                    ? 'bg-[#3b82f6] text-white font-semibold shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTab('alerts')}
              >
                <Bell size={18} className="md:w-[18px] md:h-[18px]" />
                <span className="hidden md:inline">Travel Alerts</span>
              </button>
              <button
                className={`px-3 md:px-6 py-2 md:py-3 rounded-t-lg transition-all flex items-center gap-1 md:gap-2 text-xs md:text-base whitespace-nowrap ${
                  selectedTab === 'preferences'
                    ? 'bg-[#3b82f6] text-white font-semibold shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTab('preferences')}
              >
                <Heart size={18} className="md:w-[18px] md:h-[18px]" />
                <span className="hidden md:inline">Preferences</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-8 h-[500px] md:h-[600px] overflow-y-auto">
            {/* Personal Details Content */}
            {selectedTab === 'personal' && (
              <div className="space-y-3">
                {/* Personal Information Section */}
                <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <button 
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                    onClick={() => setOpenPersonalSections(prev => ({ ...prev, personalInfo: !prev.personalInfo }))}
                  >
                    <h2 className="text-base md:text-xl font-bold text-[#1c398e]">PERSONAL INFORMATION</h2>
                    <motion.div
                      animate={{ rotate: openPersonalSections.personalInfo ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {openPersonalSections.personalInfo && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, delay: 0.15 }}
                          className="p-3 md:p-4 bg-white"
                        >
                  <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-2">
                    {/* Photo Section */}
                    <div className="flex-shrink-0 mx-auto md:mx-0">
                      <div className="w-32 h-40 md:w-44 md:h-56 border-2 md:border-4 border-[#3b82f6] bg-gradient-to-br from-[#60a5fa] to-[#3b82f6] rounded-xl flex items-center justify-center overflow-hidden shadow-xl relative">
                        {profilePhoto ? (
                          <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover relative z-10" />
                        ) : (
                          <User className="w-16 h-16 md:w-24 md:h-24 text-white opacity-90 relative z-10" />
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          isIconOnly
                          className="flex-1 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white shadow-md"
                          size="lg"
                          onPress={handlePhotoUpload}
                        >
                          <Upload size={18} className="md:w-5 md:h-5" />
                        </Button>
                        <Button
                          isIconOnly
                          className="flex-1 bg-white border-2 border-[#3b82f6] text-[#3b82f6] hover:bg-blue-50"
                          size="lg"
                          onPress={handlePhotoRemove}
                        >
                          <User size={18} className="md:w-5 md:h-5 opacity-50" />
                        </Button>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4">
                      <div>
                        <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                          FIRST NAME
                        </label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                            inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                          LAST NAME
                        </label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                            inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                          DATE OF BIRTH
                        </label>
                        <Input
                          value={formData.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                            inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                          NATIONALITY
                        </label>
                        <Input
                          value={formData.nationality}
                          onChange={(e) => handleInputChange('nationality', e.target.value)}
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                            inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                          PASSPORT NUMBER
                        </label>
                        <Input
                          value={formData.passportNumber}
                          onChange={(e) => handleInputChange('passportNumber', e.target.value)}
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                            inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                          PASSPORT EXPIRY
                        </label>
                        <Input
                          value={formData.passportExpiry}
                          onChange={(e) => handleInputChange('passportExpiry', e.target.value)}
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                            inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Contacts and Emergency Information */}
                <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <button 
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                    onClick={() => setOpenPersonalSections(prev => ({ ...prev, contactInfo: !prev.contactInfo }))}
                  >
                    <h3 className="text-base md:text-xl font-bold text-[#1c398e]">CONTACTS AND EMERGENCY INFORMATION</h3>
                    <motion.div
                      animate={{ rotate: openPersonalSections.contactInfo ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {openPersonalSections.contactInfo && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, delay: 0.15 }}
                          className="p-4 md:p-6 bg-white"
                        >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4">
                      <div>
                        <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                          SECURITY CODE
                        </label>
                        <Input
                          value={formData.securityCode}
                          onChange={(e) => handleInputChange('securityCode', e.target.value)}
                          placeholder="Enter new security code"
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                            inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                          EMAIL ADDRESS
                        </label>
                        <Input
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                            inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                          CONTACT NUMBER
                        </label>
                        <Input
                          value={formData.contactNumber}
                          onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                            inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                          RESIDENCE ADDRESS
                        </label>
                        <Input
                          value={formData.residenceAddress}
                          onChange={(e) => handleInputChange('residenceAddress', e.target.value)}
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                            inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                          }}
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                          EMERGENCY CONTACT
                        </label>
                        <Input
                          value={formData.emergencyContact}
                          onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                            inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                          }}
                        />
                      </div>
                    </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Button
                  startContent={<CheckCircle size={16} className="md:w-[18px] md:h-[18px]" />}
                  className="mt-2 w-full md:w-auto bg-[#1c398e] text-white font-bold px-6 md:px-8 py-5 md:py-6 text-sm md:text-base shadow-lg hover:bg-[#2c5aa0]"
                >
                  Update Passport Details
                </Button>
              </div>
            )}

            {/* Payment Details Content */}
            {selectedTab === 'payment' && (
              <div className="border-2 md:border-4 border-[#3b82f6] bg-[#fef9ed] p-4 md:p-8 rounded-xl shadow-lg">
                <div className="mb-4 md:mb-6">
                  <h2 className="text-base md:text-xl font-bold text-[#1c398e]">PAYMENT CREDENTIALS</h2>
                  <p className="text-xs md:text-sm text-gray-600">Secure payment method for travel bookings</p>
                </div>

                <div className="space-y-4 md:space-y-5">
                  <div>
                    <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                      CARD NUMBER
                    </label>
                    <Input
                      value={paymentData.cardNumber}
                      onChange={(e) => handlePaymentChange('cardNumber', e.target.value)}
                      className="bg-[#e8f0fe]"
                      classNames={{
                        input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                        inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                      CARDHOLDER NAME
                    </label>
                    <Input
                      value={paymentData.cardholderName}
                      onChange={(e) => handlePaymentChange('cardholderName', e.target.value)}
                      placeholder="Name as it appears on card"
                      className="bg-[#e8f0fe]"
                      classNames={{
                        input: 'bg-[#e8f0fe] text-gray-500',
                        inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                        EXPIRY DATE
                      </label>
                      <Input
                        value={paymentData.expiryDate}
                        onChange={(e) => handlePaymentChange('expiryDate', e.target.value)}
                        placeholder="MM/YY"
                        className="bg-[#e8f0fe]"
                        classNames={{
                          input: 'bg-[#e8f0fe] text-gray-500',
                          inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                        SECURITY CODE
                      </label>
                      <Input
                        value={paymentData.securityCode}
                        onChange={(e) => handlePaymentChange('securityCode', e.target.value)}
                        className="bg-[#e8f0fe]"
                        classNames={{
                          input: 'bg-[#e8f0fe] text-gray-900 font-medium',
                          inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#3b82f6] mb-2 block tracking-wider font-bold">
                      BILLING ADDRESS
                    </label>
                    <Input
                      value={paymentData.billingAddress}
                      onChange={(e) => handlePaymentChange('billingAddress', e.target.value)}
                      placeholder="Street, City, State, ZIP Code"
                      className="bg-[#e8f0fe]"
                      classNames={{
                        input: 'bg-[#e8f0fe] text-gray-500',
                        inputWrapper: 'bg-[#e8f0fe] border-2 border-blue-300 shadow-sm hover:border-blue-400',
                      }}
                    />
                  </div>
                </div>

                <Button
                  startContent={<CheckCircle size={16} className="md:w-[18px] md:h-[18px]" />}
                  className="mt-6 w-full md:w-auto bg-[#1c398e] text-white font-bold px-6 md:px-8 py-5 md:py-6 text-sm md:text-base shadow-lg hover:bg-[#2c5aa0]"
                >
                  Save Payment Method
                </Button>
              </div>
            )}

            {/* Travel Alerts Content */}
            {selectedTab === 'alerts' && (
              <div className="border-2 md:border-4 border-[#3b82f6] bg-[#fef9ed] p-4 md:p-8 rounded-xl shadow-lg">
                <div className="mb-4 md:mb-6">
                  <h2 className="text-base md:text-xl font-bold text-[#1c398e]">TRAVEL ALERTS</h2>
                  <p className="text-xs md:text-sm text-gray-600">Manage how you receive notifications</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries({
                    emailNotifications: { title: 'Email Notifications', desc: 'Receive updates via email' },
                    pushNotifications: { title: 'Push Notifications', desc: 'Receive push notifications on your device' },
                    smsNotifications: { title: 'SMS Notifications', desc: 'Receive text messages for important updates' },
                    marketingEmails: { title: 'Marketing Emails', desc: 'Receive promotional content and offers' },
                    tripUpdates: { title: 'Trip Updates', desc: 'Get notified about your upcoming trips' },
                    reminderNotifications: { title: 'Reminder Notifications', desc: 'Get reminders for upcoming events' },
                  }).map(([key, { title, desc }]) => (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        notifications[key as keyof typeof notifications]
                          ? 'border-[#3b82f6] bg-[#dbeafe] shadow-md'
                          : 'border-gray-300 bg-white hover:border-[#3b82f6] hover:shadow-sm'
                      }`}
                      onClick={() => handleNotificationToggle(key, !notifications[key as keyof typeof notifications])}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 ${
                          notifications[key as keyof typeof notifications] ? 'bg-[#3b82f6] border-[#3b82f6]' : 'border-gray-300 bg-white'
                        }`}>
                          <AnimatePresence mode="wait">
                            {notifications[key as keyof typeof notifications] && (
                              <motion.div
                                key="checkmark"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ 
                                  type: "spring", 
                                  stiffness: 500, 
                                  damping: 25,
                                  duration: 0.3
                                }}
                              >
                                <CheckCircle className="w-4 h-4 text-white" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <p className="text-sm text-gray-900 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>

                <Button
                  startContent={<CheckCircle size={16} className="md:w-[18px] md:h-[18px]" />}
                  className="mt-6 w-full md:w-auto bg-[#1c398e] text-white font-bold px-6 md:px-8 py-5 md:py-6 text-sm md:text-base shadow-lg hover:bg-[#2c5aa0]"
                >
                  Save Preferences
                </Button>
              </div>
            )}

            {/* Preferences Content with Sub-Tabs */}
            {selectedTab === 'preferences' && (
              <div className="border-2 md:border-4 border-[#3b82f6] bg-[#fef9ed] p-4 md:p-8 rounded-xl shadow-lg">
                <div className="mb-4 md:mb-6">
                  <h2 className="text-base md:text-xl font-bold text-[#1c398e]">TRAVEL PREFERENCES</h2>
                  <p className="text-xs md:text-sm text-gray-600">Customize your travel experience</p>
                </div>

                {/* Sub-Tabs for Preferences */}
                <div className="mb-6 border-b-2 border-gray-200">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                      className={`px-3 md:px-4 py-2 rounded-t-md transition-all flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap ${
                        selectedPreferenceSubTab === 'general'
                          ? 'bg-[#3b82f6] text-white font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedPreferenceSubTab('general')}
                    >
                      <Compass size={18} className="md:w-4 md:h-4" />
                      <span className="hidden md:inline">General</span>
                    </button>
                    <button
                      className={`px-3 md:px-4 py-2 rounded-t-md transition-all flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap ${
                        selectedPreferenceSubTab === 'dining'
                          ? 'bg-[#3b82f6] text-white font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedPreferenceSubTab('dining')}
                    >
                      <Utensils size={18} className="md:w-4 md:h-4" />
                      <span className="hidden md:inline">Dining</span>
                    </button>
                    <button
                      className={`px-3 md:px-4 py-2 rounded-t-md transition-all flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap ${
                        selectedPreferenceSubTab === 'flights'
                          ? 'bg-[#3b82f6] text-white font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedPreferenceSubTab('flights')}
                    >
                      <PlaneTakeoff size={18} className="md:w-4 md:h-4" />
                      <span className="hidden md:inline">Flights</span>
                    </button>
                    <button
                      className={`px-3 md:px-4 py-2 rounded-t-md transition-all flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap ${
                        selectedPreferenceSubTab === 'accommodation'
                          ? 'bg-[#3b82f6] text-white font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedPreferenceSubTab('accommodation')}
                    >
                      <Star size={18} className="md:w-4 md:h-4" />
                      <span className="hidden md:inline">Hotels</span>
                    </button>
                    <button
                      className={`px-3 md:px-4 py-2 rounded-t-md transition-all flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap ${
                        selectedPreferenceSubTab === 'carrental'
                          ? 'bg-[#3b82f6] text-white font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedPreferenceSubTab('carrental')}
                    >
                      <Car size={18} className="md:w-4 md:h-4" />
                      <span className="hidden md:inline">Car Rentals</span>
                    </button>
                  </div>
                </div>

                {/* General Preferences */}
                {selectedPreferenceSubTab === 'general' && (
                  <div className="space-y-3">
                    {/* Travel Interests - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleGeneralSection('interests')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Travel Interests</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('interests').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openGeneralSections.interests && getSelectedItems('interests').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('interests').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openGeneralSections.interests ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openGeneralSections.interests && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries({
                                  adventure: { title: 'Adventure & Hiking', desc: 'Outdoor activities, trekking, and thrilling experiences' },
                                  nightlife: { title: 'Nightlife', desc: 'Bars, clubs, and entertainment' },
                                  museums: { title: 'Museums & History', desc: 'Cultural sites and exhibitions' },
                                  beaches: { title: 'Beaches & Water', desc: 'Coastal activities and water sports' },
                                  shopping: { title: 'Shopping', desc: 'Markets and retail experiences' },
                                  foodTours: { title: 'Food & Culinary', desc: 'Food tours and culinary experiences' },
                                  relaxation: { title: 'Relaxation & Wellness', desc: 'Spas and wellness activities' },
                                  luxury: { title: 'Luxury Travel', desc: 'Premium experiences and services' },
                                  budget: { title: 'Budget-Friendly', desc: 'Affordable options and savings' },
                                  photography: { title: 'Photography', desc: 'Scenic spots and landmarks' },
                                  localCulture: { title: 'Local Culture', desc: 'Authentic local experiences' },
                                }).map(([key, { title, desc }]) => (
                                  <div
                                    key={key}
                                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                      preferences[key as keyof typeof preferences]
                                        ? 'border-[#3b82f6] bg-[#dbeafe] shadow-md'
                                        : 'border-gray-300 bg-white hover:border-[#3b82f6] hover:shadow-sm'
                                    }`}
                                    onClick={() => handlePreferenceToggle(key, !preferences[key as keyof typeof preferences])}
                                  >
                                    <div className="flex items-start justify-between mb-1.5">
                                      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 ${
                                        preferences[key as keyof typeof preferences] ? 'bg-[#3b82f6] border-[#3b82f6]' : 'border-gray-300 bg-white'
                                      }`}>
                                        <AnimatePresence mode="wait">
                                          {preferences[key as keyof typeof preferences] && (
                                            <motion.div
                                              key="checkmark"
                                              initial={{ scale: 0, opacity: 0 }}
                                              animate={{ scale: 1, opacity: 1 }}
                                              exit={{ scale: 0, opacity: 0 }}
                                              transition={{ 
                                                type: "spring", 
                                                stiffness: 500, 
                                                damping: 25,
                                                duration: 0.3
                                              }}
                                            >
                                              <CheckCircle className="w-4 h-4 text-white" />
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-900 leading-relaxed">{desc}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Language Skills - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleGeneralSection('language')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Language Skills</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('language').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openGeneralSections.language && getSelectedItems('language').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('language').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openGeneralSections.language ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openGeneralSections.language && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="flex flex-wrap gap-2">
                        {Object.entries({
                          english: 'English',
                          spanish: 'Spanish',
                          french: 'French',
                          german: 'German',
                          italian: 'Italian',
                          portuguese: 'Portuguese',
                          mandarin: 'Mandarin Chinese',
                          japanese: 'Japanese',
                          arabic: 'Arabic',
                        }).map(([key, title]) => (
                          <button
                            key={key}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                              preferences[key as keyof typeof preferences]
                                ? 'bg-[#3b82f6] text-white shadow-md hover:bg-[#2c5aa0]'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                            onClick={() => handlePreferenceToggle(key, !preferences[key as keyof typeof preferences])}
                          >
                            {preferences[key as keyof typeof preferences] ? (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </motion.div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                            )}
                            {title}
                          </button>
                        ))}
                      </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Accessibility - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleGeneralSection('accessibility')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Accessibility</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('accessibility').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openGeneralSections.accessibility && getSelectedItems('accessibility').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('accessibility').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openGeneralSections.accessibility ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openGeneralSections.accessibility && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="flex flex-wrap gap-2">
                        {Object.entries({
                          wheelchairAccessible: 'Wheelchair Accessible',
                          visualImpairment: 'Visual Impairment',
                          hearingImpairment: 'Hearing Impairment',
                          mobilityAssistance: 'Mobility Assistance',
                          withInfants: 'Traveling with Infants',
                          seniorFriendly: 'Senior-Friendly',
                        }).map(([key, title]) => (
                          <button
                            key={key}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                              preferences[key as keyof typeof preferences]
                                ? 'bg-[#3b82f6] text-white shadow-md hover:bg-[#2c5aa0]'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                            onClick={() => handlePreferenceToggle(key, !preferences[key as keyof typeof preferences])}
                          >
                            {preferences[key as keyof typeof preferences] ? (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </motion.div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                            )}
                            {title}
                          </button>
                        ))}
                      </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Travel Style - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleGeneralSection('travelStyle')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Travel Style</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('travelStyle').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openGeneralSections.travelStyle && getSelectedItems('travelStyle').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('travelStyle').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openGeneralSections.travelStyle ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openGeneralSections.travelStyle && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="flex flex-wrap gap-2">
                        {Object.entries({
                          soloTraveler: 'Solo Traveler',
                          couple: 'Couple',
                          familyWithKids: 'Family with Kids',
                          groupTravel: 'Group Travel',
                          businessTravel: 'Business Travel',
                        }).map(([key, title]) => (
                          <button
                            key={key}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                              preferences[key as keyof typeof preferences]
                                ? 'bg-[#3b82f6] text-white shadow-md hover:bg-[#2c5aa0]'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                            onClick={() => handlePreferenceToggle(key, !preferences[key as keyof typeof preferences])}
                          >
                            {preferences[key as keyof typeof preferences] ? (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </motion.div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                            )}
                            {title}
                          </button>
                        ))}
                      </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Special Needs - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleGeneralSection('specialNeeds')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Special Needs</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('specialNeeds').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openGeneralSections.specialNeeds && getSelectedItems('specialNeeds').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('specialNeeds').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openGeneralSections.specialNeeds ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openGeneralSections.specialNeeds && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="flex flex-wrap gap-2">
                        {Object.entries({
                          travelingWithPets: 'Traveling with Pets',
                          nonSmoking: 'Non-Smoking',
                          quietEnvironment: 'Quiet Environment',
                          ecoFriendly: 'Eco-Friendly',
                        }).map(([key, title]) => (
                          <button
                            key={key}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                              preferences[key as keyof typeof preferences]
                                ? 'bg-[#3b82f6] text-white shadow-md hover:bg-[#2c5aa0]'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                            onClick={() => handlePreferenceToggle(key, !preferences[key as keyof typeof preferences])}
                          >
                            {preferences[key as keyof typeof preferences] ? (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </motion.div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                            )}
                            {title}
                          </button>
                        ))}
                      </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Dining Preferences */}
                {selectedPreferenceSubTab === 'dining' && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries({
                      vegetarian: 'Vegetarian',
                      vegan: 'Vegan',
                      glutenFree: 'Gluten-Free',
                      dairyFree: 'Dairy-Free',
                      nutAllergy: 'Nut Allergy',
                      seafoodAllergy: 'Seafood Allergy',
                      halal: 'Halal',
                      kosher: 'Kosher',
                      spicyFood: 'Spicy Food Lover',
                      organicFood: 'Organic Food',
                    }).map(([key, title]) => (
                      <button
                        key={key}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                          diningPreferences[key as keyof typeof diningPreferences]
                            ? 'bg-[#3b82f6] text-white shadow-md hover:bg-[#2c5aa0]'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                        onClick={() => handleDiningPreferenceToggle(key, !diningPreferences[key as keyof typeof diningPreferences])}
                      >
                        {diningPreferences[key as keyof typeof diningPreferences] ? (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </motion.div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                        )}
                        {title}
                      </button>
                    ))}
                  </div>
                )}

                {/* Flight Preferences */}
                {selectedPreferenceSubTab === 'flights' && (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm md:text-base font-bold text-[#1c398e] mb-3">Preferred Airport</h3>
                      <div className="max-w-md">
                        <Input
                          type="text"
                          placeholder="e.g., JFK, LAX, ORD"
                          value={flightPreferences.preferredAirport as string}
                          onChange={(e) => handleFlightPreferenceToggle('preferredAirport', e.target.value)}
                          className="bg-[#e8f0fe]"
                          classNames={{
                            input: 'text-gray-900 placeholder:text-gray-500',
                            inputWrapper: 'bg-[#e8f0fe] border-gray-300 hover:bg-[#d6e4fc]',
                          }}
                        />
                        <p className="text-xs text-gray-600 mt-1">Enter your preferred departure airport code</p>
                      </div>
                    </div>

                    {/* Seating & Travel Style - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleFlightSection('seating')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Seating & Travel Style</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('seating').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openFlightSections.seating && getSelectedItems('seating').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('seating').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openFlightSections.seating ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openFlightSections.seating && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="flex flex-wrap gap-2">
                        {Object.entries({
                          windowSeat: 'Window Seat',
                          aisleSeat: 'Aisle Seat',
                          extraLegroom: 'Extra Legroom',
                          budgetAirlines: 'Budget Airlines',
                          premiumAirlines: 'Premium Airlines',
                        }).map(([key, title]) => (
                          <button
                            key={key}
                            onClick={() => handleFlightPreferenceToggle(key, !flightPreferences[key as keyof typeof flightPreferences])}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                              flightPreferences[key as keyof typeof flightPreferences]
                                ? 'bg-[#3b82f6] text-white shadow-md hover:bg-[#2c5aa0]'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                          >
                            {flightPreferences[key as keyof typeof flightPreferences] ? (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </motion.div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                            )}
                            {title}
                          </button>
                        ))}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Number of Stops - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleFlightSection('stops')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Number of Stops</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('stops').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openFlightSections.stops && getSelectedItems('stops').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('stops').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openFlightSections.stops ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openFlightSections.stops && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="flex flex-wrap gap-2">
                        {Object.entries({
                          directFlightsOnly: 'Direct Flights Only',
                          multipleStopsOk: 'Multiple Stops OK',
                        }).map(([key, title]) => (
                          <button
                            key={key}
                            onClick={() => handleFlightPreferenceToggle(key, !flightPreferences[key as keyof typeof flightPreferences])}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                              flightPreferences[key as keyof typeof flightPreferences]
                                ? 'bg-[#3b82f6] text-white shadow-md hover:bg-[#2c5aa0]'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                          >
                            {flightPreferences[key as keyof typeof flightPreferences] ? (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </motion.div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                            )}
                            {title}
                          </button>
                        ))}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Departure Time Preferences - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleFlightSection('departureTime')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Departure Time Preferences</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('departureTime').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openFlightSections.departureTime && getSelectedItems('departureTime').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('departureTime').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openFlightSections.departureTime ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openFlightSections.departureTime && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="flex flex-wrap gap-2">
                        {Object.entries({
                          earlyMorning: 'Early Morning Flights (5-8 AM)',
                          lateMorning: 'Late Morning Flights (9 AM-12 PM)',
                          afternoon: 'Afternoon Flights (12-5 PM)',
                          evening: 'Evening Flights (After 5 PM)',
                        }).map(([key, title]) => (
                          <button
                            key={key}
                            onClick={() => handleFlightPreferenceToggle(key, !flightPreferences[key as keyof typeof flightPreferences])}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                              flightPreferences[key as keyof typeof flightPreferences]
                                ? 'bg-[#3b82f6] text-white shadow-md hover:bg-[#2c5aa0]'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                          >
                            {flightPreferences[key as keyof typeof flightPreferences] ? (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </motion.div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                            )}
                            {title}
                          </button>
                        ))}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Preferred Airlines - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleFlightSection('airlines')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Preferred Airlines</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('airlines').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openFlightSections.airlines && getSelectedItems('airlines').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('airlines').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openFlightSections.airlines ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openFlightSections.airlines && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries({
                          delta: { title: 'Delta Air Lines', desc: 'SkyMiles program, extensive routes' },
                          american: { title: 'American Airlines', desc: 'AAdvantage rewards, global network' },
                          united: { title: 'United Airlines', desc: 'MileagePlus, Star Alliance member' },
                          southwest: { title: 'Southwest Airlines', desc: 'No change fees, 2 free checked bags' },
                          jetblue: { title: 'JetBlue Airways', desc: 'Free WiFi, TrueBlue rewards' },
                          alaska: { title: 'Alaska Airlines', desc: 'West Coast routes, Mileage Plan' },
                          spirit: { title: 'Spirit Airlines', desc: 'Ultra low-cost, budget fares' },
                          frontier: { title: 'Frontier Airlines', desc: 'Budget carrier, Discount Den' },
                        }).map(([key, { title, desc }]) => (
                          <div
                            key={key}
                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              flightPreferences[key as keyof typeof flightPreferences]
                                ? 'border-[#3b82f6] bg-[#dbeafe] shadow-md'
                                : 'border-gray-300 bg-white hover:border-[#3b82f6] hover:shadow-sm'
                            }`}
                            onClick={() => handleFlightPreferenceToggle(key, !flightPreferences[key as keyof typeof flightPreferences])}
                          >
                            <div className="flex items-start justify-between mb-1.5">
                              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 ${
                                flightPreferences[key as keyof typeof flightPreferences] ? 'bg-[#3b82f6] border-[#3b82f6]' : 'border-gray-300 bg-white'
                              }`}>
                                <AnimatePresence mode="wait">
                                  {flightPreferences[key as keyof typeof flightPreferences] && (
                                    <motion.div
                                      key="checkmark"
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0, opacity: 0 }}
                                      transition={{ 
                                        type: "spring", 
                                        stiffness: 500, 
                                        damping: 25,
                                        duration: 0.3
                                      }}
                                    >
                                      <CheckCircle className="w-4 h-4 text-white" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                            <p className="text-sm text-gray-900 leading-relaxed">{desc}</p>
                          </div>
                        ))}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Accommodation Preferences */}
                {selectedPreferenceSubTab === 'accommodation' && (
                  <div className="space-y-3">
                    {/* Hotel Quality & Amenities - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleHotelSection('quality')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Hotel Quality & Amenities</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('quality').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openHotelSections.quality && getSelectedItems('quality').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('quality').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openHotelSections.quality ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openHotelSections.quality && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="flex flex-wrap gap-2">
                            {Object.entries({
                              fiveStarOnly: '5-Star Hotels Only',
                              fourStarPlus: '4-Star & Above',
                              budgetFriendly: 'Budget-Friendly',
                              freeBreakfast: 'Free Breakfast',
                              freeWiFi: 'Free WiFi',
                              gym: 'Fitness Center',
                              pool: 'Swimming Pool',
                              spa: 'Spa Services',
                              parking: 'Free Parking',
                              petFriendly: 'Pet-Friendly',
                            }).map(([key, title]) => (
                              <button
                                key={key}
                                onClick={() => handleAccommodationPreferenceToggle(key, !accommodationPreferences[key as keyof typeof accommodationPreferences])}
                                className={`px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                  accommodationPreferences[key as keyof typeof accommodationPreferences]
                                    ? 'bg-[#3b82f6] text-white shadow-md hover:bg-[#2c5aa0]'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                }`}
                              >
                                {accommodationPreferences[key as keyof typeof accommodationPreferences] ? (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </motion.div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                                )}
                                {title}
                              </button>
                            ))}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Room Details - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleHotelSection('roomDetails')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Room Details</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('roomDetails').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openHotelSections.roomDetails && getSelectedItems('roomDetails').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('roomDetails').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openHotelSections.roomDetails ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openHotelSections.roomDetails && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="flex flex-wrap gap-2">
                            {Object.entries({
                              oneRoomOneBed: 'One Room, One Bed',
                              oneRoomTwoBeds: 'One Room, Two Beds',
                              twoRooms: 'Two Rooms',
                              suite: 'Suite',
                              luxuryRoom: 'Luxury Room',
                              penthouse: 'Penthouse',
                              connectingRooms: 'Connecting Rooms',
                              adjoiningRooms: 'Adjoining Rooms',
                              adjacentRooms: 'Adjacent Rooms',
                            }).map(([key, title]) => (
                              <button
                                key={key}
                                onClick={() => handleAccommodationPreferenceToggle(key, !accommodationPreferences[key as keyof typeof accommodationPreferences])}
                                className={`px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                  accommodationPreferences[key as keyof typeof accommodationPreferences]
                                    ? 'bg-[#3b82f6] text-white shadow-md hover:bg-[#2c5aa0]'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                }`}
                              >
                                {accommodationPreferences[key as keyof typeof accommodationPreferences] ? (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </motion.div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                                )}
                                {title}
                              </button>
                            ))}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Preferred Hotel Chains & Brands - Collapsible */}
                    <div className="border-2 border-[#3b82f6] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleHotelSection('chains')}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#fef9ed] to-[#fdf5e6] hover:from-[#fdf5e6] hover:to-[#fcf1dd] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-start gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#1c398e]">Preferred Hotel Chains & Brands</h3>
                            <span className="text-xs bg-[#3b82f6] text-white px-2 py-0.5 rounded-full font-semibold">
                              {getSelectedItems('chains').length}
                            </span>
                          </div>
                          <AnimatePresence>
                            {!openHotelSections.chains && getSelectedItems('chains').length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex flex-wrap gap-1.5 mt-1"
                              >
                                {getSelectedItems('chains').map((item) => (
                                  <span key={item} className="text-xs bg-[#dbeafe] text-[#1c398e] px-2 py-1 rounded-md font-medium">
                                    {item}
                                  </span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.div
                          animate={{ rotate: openHotelSections.chains ? 180 : 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <ChevronDown className="w-6 h-6 text-[#1c398e] group-hover:scale-110 transition-transform flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openHotelSections.chains && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              className="p-4 bg-white"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {Object.entries({
                              marriott: { title: 'Marriott Bonvoy', desc: 'Marriott, Ritz-Carlton, W Hotels, Sheraton' },
                              hilton: { title: 'Hilton Honors', desc: 'Hilton, Conrad, Waldorf Astoria, DoubleTree' },
                              hyatt: { title: 'World of Hyatt', desc: 'Park Hyatt, Grand Hyatt, Andaz' },
                              ihg: { title: 'IHG One Rewards', desc: 'InterContinental, Holiday Inn, Crowne Plaza' },
                              accor: { title: 'Accor Live Limitless', desc: 'Sofitel, Novotel, Mercure, ibis' },
                              wyndham: { title: 'Wyndham Rewards', desc: 'Wyndham, Ramada, Days Inn, Super 8' },
                              choiceHotels: { title: 'Choice Privileges', desc: 'Comfort Inn, Quality Inn, Clarion' },
                              bestWestern: { title: 'Best Western Rewards', desc: 'Best Western Plus, Premier, Vīb' },
                              airbnb: { title: 'Airbnb', desc: 'Unique homes and local experiences' },
                              vrbo: { title: 'Vrbo Rentals', desc: 'Vacation rentals for families and groups' },
                            }).map(([key, { title, desc }]) => (
                              <div
                                key={key}
                                className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                  accommodationPreferences[key as keyof typeof accommodationPreferences]
                                    ? 'border-[#3b82f6] bg-[#dbeafe] shadow-md'
                                    : 'border-gray-300 bg-white hover:border-[#3b82f6] hover:shadow-sm'
                                }`}
                                onClick={() => handleAccommodationPreferenceToggle(key, !accommodationPreferences[key as keyof typeof accommodationPreferences])}
                              >
                                <div className="flex items-start justify-between mb-1.5">
                                  <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 ${
                                    accommodationPreferences[key as keyof typeof accommodationPreferences] ? 'bg-[#3b82f6] border-[#3b82f6]' : 'border-gray-300 bg-white'
                                  }`}>
                                    <AnimatePresence mode="wait">
                                      {accommodationPreferences[key as keyof typeof accommodationPreferences] && (
                                        <motion.div
                                          key="checkmark"
                                          initial={{ scale: 0, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          exit={{ scale: 0, opacity: 0 }}
                                          transition={{ 
                                            type: "spring", 
                                            stiffness: 500, 
                                            damping: 25,
                                            duration: 0.3
                                          }}
                                        >
                                          <CheckCircle className="w-4 h-4 text-white" />
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-900 leading-relaxed">{desc}</p>
                              </div>
                            ))}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Car Rental Preferences */}
                {selectedPreferenceSubTab === 'carrental' && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries({
                      compactCar: 'Compact Car',
                      sedanCar: 'Sedan / Mid-Size',
                      suvCar: 'SUV / Crossover',
                      luxuryCar: 'Luxury Vehicle',
                      vanMinibus: 'Van / Minibus',
                      automaticTransmission: 'Automatic',
                      manualTransmission: 'Manual',
                      electricVehicle: 'Electric Vehicle',
                      hybridVehicle: 'Hybrid Vehicle',
                      gpsNavigation: 'GPS Navigation',
                      unlimitedMileage: 'Unlimited Mileage',
                      fullInsurance: 'Full Insurance',
                      additionalDriver: 'Additional Driver',
                      childSeat: 'Child/Booster Seat',
                      airportPickup: 'Airport Pickup/Dropoff',
                    }).map(([key, title]) => (
                      <button
                        key={key}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                          carRentalPreferences[key as keyof typeof carRentalPreferences]
                            ? 'bg-[#3b82f6] text-white shadow-md hover:bg-[#2c5aa0]'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                        onClick={() => handleCarRentalPreferenceToggle(key, !carRentalPreferences[key as keyof typeof carRentalPreferences])}
                      >
                        {carRentalPreferences[key as keyof typeof carRentalPreferences] ? (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </motion.div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                        )}
                        {title}
                      </button>
                    ))}
                  </div>
                )}

                <Button
                  startContent={<CheckCircle size={16} className="md:w-[18px] md:h-[18px]" />}
                  className="mt-6 w-full md:w-auto bg-[#1c398e] text-white font-bold px-6 md:px-8 py-5 md:py-6 text-sm md:text-base shadow-lg hover:bg-[#2c5aa0]"
                  onPress={() => {}}
                >
                  Save Preferences
                </Button>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Footer */}
      <Footer />
      </div>
    </div>
  );
}