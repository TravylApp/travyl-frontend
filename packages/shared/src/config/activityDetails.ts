// Activity detail data for Rome itinerary
// Images are Unsplash URLs (no figma:asset imports needed in Next.js)

const phoneBookingApp = 'https://images.unsplash.com/photo-1730818029039-662126e61821?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400';
const phoneMapApp = 'https://images.unsplash.com/photo-1507617819282-1c1d659895e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400';
const phoneTicketApp = 'https://images.unsplash.com/photo-1565268878573-5f968e45c9fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400';

export interface ActivityDetailData {
  title: string;
  image: string;
  type: string;
  time: string;
  duration: string;
  location: string;
  price: string;
  description: string;
  highlights: string[];
  rating: number;
  reviews: number;
  included?: string[];
  notIncluded?: string[];
  meetingPoint?: string;
  languages?: string[];
  difficulty?: string;
  accessibility?: string;
  maxParticipants?: number;
  phoneSteps?: { title: string; description: string; screenshot: string }[];
}

export const ACTIVITY_DETAILS: Record<string, ActivityDetailData> = {
  colosseum: {
    title: 'Colosseum',
    image: 'https://images.unsplash.com/photo-1707414580289-f8919dbdafcc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    type: 'Sightseeing',
    time: '8:30 AM',
    duration: '2 hours',
    location: 'Piazza del Colosseo, 1, 00184 Roma RM, Italy',
    price: '€16 per person',
    description: 'Step back in time at the iconic Colosseum, one of the greatest works of Roman architecture and engineering. Explore the ancient amphitheater where gladiators once fought, and marvel at the impressive structure that could hold up to 80,000 spectators.',
    highlights: ['Skip-the-line entry', 'Audio guide included', 'Ancient amphitheater', 'Photo opportunities'],
    rating: 4.7,
    reviews: 12453,
    included: ['Skip-the-line ticket', 'Audio guide', 'Arena floor access'],
    notIncluded: ['Food and drinks', 'Hotel pickup', 'Gratuities'],
    meetingPoint: 'South entrance of the Colosseum, near the ticket office',
    languages: ['English', 'Italian', 'Spanish', 'French'],
    difficulty: 'Easy',
    accessibility: 'Elevator access available',
    maxParticipants: 25,
    phoneSteps: [
      { title: 'Open your ticket confirmation', description: 'Check your email for the Colosseum ticket confirmation and QR code', screenshot: phoneTicketApp },
      { title: 'Navigate to entrance', description: 'Use Google Maps to find the skip-the-line entrance at the Colosseum', screenshot: phoneMapApp },
      { title: 'Show QR code at entrance', description: 'Present your digital ticket to skip the regular line', screenshot: phoneBookingApp },
    ],
  },
  foodTour: {
    title: 'Eating Europe Food Tours',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    type: 'Food & Wine',
    time: '2:00 PM',
    duration: '3.5 hours',
    location: 'Testaccio neighborhood, Rome',
    price: '€94 per person',
    description: 'Discover Rome\'s culinary treasures on this guided food tour through the authentic Testaccio neighborhood. Taste traditional Roman dishes, visit local markets, and learn about Italian food culture from expert guides.',
    highlights: ['10+ food tastings', 'Local wine tasting', 'Market visit', 'Expert local guide'],
    rating: 4.9,
    reviews: 8765,
    included: ['10+ food tastings', 'Wine and drinks', 'Expert guide', 'Market tour'],
    notIncluded: ['Additional drinks', 'Gratuities', 'Hotel transfer'],
    meetingPoint: 'Piazza di Testaccio, next to the fountain',
    languages: ['English', 'Italian'],
    difficulty: 'Easy',
    maxParticipants: 12,
  },
  capitoline: {
    title: 'Capitoline Museums',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    type: 'Museum',
    time: '9:00 AM',
    duration: '2.5 hours',
    location: 'Piazza del Campidoglio, 1, 00186 Roma RM, Italy',
    price: '€15 per person',
    description: 'Visit the world\'s oldest public museum complex on Capitoline Hill. Marvel at ancient Roman sculptures, Renaissance art, and panoramic views of the Roman Forum.',
    highlights: ['Ancient sculptures', 'Renaissance art', 'Roman Forum views', 'Historic building'],
    rating: 4.6,
    reviews: 5432,
  },
  romanForum: {
    title: 'Roman Forum',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    type: 'Historic Site',
    time: '2:00 PM',
    duration: '2 hours',
    location: 'Roman Forum, Rome, Italy',
    price: '€16 per person',
    description: 'Walk through the ancient heart of Rome at the Roman Forum. Once the center of Roman public life, this archaeological site offers a glimpse into the grandeur of ancient civilization.',
    highlights: ['Ancient ruins', 'Historical significance', 'Archaeological site', 'Guided tours available'],
    rating: 4.7,
    reviews: 9876,
  },
  vatican: {
    title: 'Vatican Museums & Sistine Chapel',
    image: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    type: 'Museum',
    time: '8:00 AM',
    duration: '3.5 hours',
    location: 'Vatican City, Rome',
    price: '€120 per person',
    description: 'Early morning priority access to the Vatican Museums and Sistine Chapel. Explore one of the world\'s greatest art collections including Michelangelo\'s masterpiece.',
    highlights: ['Skip-the-line access', 'Sistine Chapel', 'Raphael Rooms', 'Expert guide'],
    rating: 4.9,
    reviews: 18234,
    included: ['Skip-the-line ticket', 'Expert guide', 'Headset for commentary', 'Sistine Chapel access'],
    notIncluded: ['Food and drinks', 'St. Peter\'s Basilica entrance', 'Dome climb'],
    meetingPoint: 'Vatican Museums entrance, near the spiral staircase',
    languages: ['English', 'Italian', 'Spanish', 'French', 'German'],
    difficulty: 'Easy',
    accessibility: 'Wheelchair accessible with elevator',
    maxParticipants: 20,
    phoneSteps: [
      { title: 'Download the Vatican app', description: 'Download the official Vatican Museums app for an interactive map', screenshot: phoneBookingApp },
      { title: 'Show your booking', description: 'Present the QR code at the priority entrance gate', screenshot: phoneTicketApp },
      { title: 'Follow the guided route', description: 'Your guide will lead you through the highlights in 3.5 hours', screenshot: phoneMapApp },
    ],
  },
  trastevere: {
    title: 'Trastevere Food & Wine Walk',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    type: 'Food Tour',
    time: '6:00 PM',
    duration: '3 hours',
    location: 'Trastevere, Rome',
    price: '€85 per person',
    description: 'Explore Rome\'s most charming neighborhood with a local guide. Sample authentic street food, visit family-run eateries, and taste regional wines.',
    highlights: ['Local guide', '8+ tastings', 'Wine pairing', 'Historic neighborhood'],
    rating: 4.8,
    reviews: 6543,
    included: ['8+ food tastings', 'Wine and drinks', 'Local guide'],
    notIncluded: ['Additional drinks', 'Gratuities'],
    languages: ['English', 'Italian'],
    maxParticipants: 10,
  },
  borghese: {
    title: 'Galleria Borghese',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    type: 'Museum',
    time: '9:00 AM',
    duration: '2 hours',
    location: 'Piazzale Scipione Borghese, 5, Rome',
    price: '€15 per person',
    description: 'Discover masterpieces by Bernini, Caravaggio, and Raphael in this intimate gallery. Set in beautiful gardens, it houses one of Rome\'s finest art collections.',
    highlights: ['Bernini sculptures', 'Caravaggio paintings', 'Villa gardens', 'Advanced booking required'],
    rating: 4.8,
    reviews: 8976,
  },
  colosseumEvening: {
    title: 'Colosseum Night Tour',
    image: 'https://images.unsplash.com/photo-1762352522316-1c82454bdbef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    type: 'Sightseeing',
    time: '6:00 PM',
    duration: '2 hours',
    location: 'Piazza del Colosseo, 1, Rome, Italy',
    price: '€32 per person',
    description: 'Experience the Colosseum in a whole new light with this exclusive evening tour. See the ancient amphitheater beautifully illuminated.',
    highlights: ['Evening atmosphere', 'Fewer crowds', 'Illuminated monument', 'Special access'],
    rating: 4.8,
    reviews: 4521,
  },
  appianWay: {
    title: 'Appian Way & Catacombs',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    type: 'Historic Tour',
    time: '9:00 AM',
    duration: '3 hours',
    location: 'Via Appia Antica, Rome',
    price: '€45 per person',
    description: 'Bike along ancient Rome\'s most famous road. Explore underground catacombs and visit ruins of Roman villas in a peaceful setting away from crowds.',
    highlights: ['Bike tour', 'Catacomb visit', 'Ancient road', 'Countryside views'],
    rating: 4.7,
    reviews: 4532,
    included: ['Bike rental', 'Helmet', 'Catacomb entrance', 'Guide'],
    notIncluded: ['Lunch', 'Tips', 'Travel insurance'],
    meetingPoint: 'Bike rental shop at Via Appia Antica, 58',
    difficulty: 'Moderate',
    maxParticipants: 15,
  },
  pantheon: {
    title: 'Pantheon & Piazza Navona',
    image: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    type: 'Sightseeing',
    time: '2:00 PM',
    duration: '2 hours',
    location: 'Piazza della Rotonda, Rome',
    price: 'Free',
    description: 'Marvel at the Pantheon\'s perfect dome and explore the baroque fountains of Piazza Navona. Stop for gelato and people-watch in these iconic squares.',
    highlights: ['Ancient architecture', 'Baroque fountains', 'Street artists', 'Historic cafés'],
    rating: 4.8,
    reviews: 19876,
  },
};
