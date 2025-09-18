export interface Coach {
  id: string;
  name: string;
  beltRank: string;
  bio: string;
  photoUrl: string;
  specialties: string[];
  achievements: string[];
  experience: string;
  philosophy: string;
}

export const coaches: Coach[] = [
  {
    id: "marcus-silva",
    name: "Marcus Silva",
    beltRank: "3rd Degree Black Belt",
    bio: "Head instructor with 15+ years of teaching experience. IBJJF World Champion and passionate about developing both competitive athletes and recreational practitioners.",
    photoUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
    specialties: ["Competition Training", "Fundamentals", "Self-Defense"],
    achievements: [
      "IBJJF World Champion (2018)",
      "3x Pan American Champion",
      "ADCC Trials Winner",
      "15+ years teaching experience"
    ],
    experience: "Started training in 2005 in Brazil under legendary coach Roberto Silva. Moved to the US in 2015 to share his knowledge and passion for BJJ.",
    philosophy: "I believe BJJ is for everyone. My goal is to help each student reach their potential while building confidence, discipline, and respect."
  },
  {
    id: "ana-rodriguez",
    name: "Ana Rodriguez", 
    beltRank: "2nd Degree Brown Belt",
    bio: "Women's program coordinator and kids' instructor. Multiple-time Pan Am medalist specializing in technical precision and guard play.",
    photoUrl: "https://images.unsplash.com/photo-1594381898411-846e7d193883?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
    specialties: ["Women's Program", "Guard Play", "Kids Classes"],
    achievements: [
      "3x Pan American Medalist",
      "World Champion (Brown Belt)",
      "10+ years teaching experience",
      "Certified Kids BJJ Instructor"
    ],
    experience: "Started training in 2012 and quickly fell in love with the technical aspects of BJJ. Specializes in creating a welcoming environment for women and children.",
    philosophy: "BJJ taught me that size and strength don't matter - technique and determination do. I love helping students discover their inner strength."
  },
  {
    id: "jake-thompson",
    name: "Jake Thompson",
    beltRank: "1st Degree Purple Belt", 
    bio: "Former MMA fighter and conditioning specialist. Focuses on strength training integration and practical self-defense applications.",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
    specialties: ["MMA Integration", "Conditioning", "No-Gi"],
    achievements: [
      "Former Professional MMA Fighter (8-2 record)",
      "NASM Certified Personal Trainer",
      "Conditioning Specialist",
      "5+ years BJJ experience"
    ],
    experience: "Transitioned from MMA to focus on BJJ and fitness coaching. Brings a unique perspective combining martial arts with modern strength and conditioning principles.",
    philosophy: "BJJ is the perfect blend of physical and mental challenge. I help students build not just technique, but the physical foundation to execute it effectively."
  }
];

export const getCoachById = (id: string): Coach | undefined => {
  return coaches.find(coach => coach.id === id);
};

export const getCoachesBySpecialty = (specialty: string): Coach[] => {
  return coaches.filter(coach => 
    coach.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
  );
};

// FAQ content for coaches page
export const coachingFAQ = [
  {
    question: "What should I bring to my session?",
    answer: "Just comfortable athletic wear. We provide all necessary equipment including gis, belts, and mats."
  },
  {
    question: "Can I cancel or reschedule?",
    answer: "Yes, you can reschedule with 24 hours notice. Cancellations within 24 hours are subject to a 50% fee."
  },
  {
    question: "Is personal training suitable for beginners?",
    answer: "Absolutely! Personal training is perfect for beginners as it allows for personalized instruction and faster learning."
  },
  {
    question: "How do I choose the right coach?",
    answer: "Consider your goals and preferences. Our head instructor Marcus is great for competition prep, Ana specializes in technical development and women's training, and Jake focuses on fitness integration and practical applications."
  },
  {
    question: "What if I have injuries or physical limitations?",
    answer: "Our coaches are experienced in working with students of all physical abilities. Please inform us of any limitations during booking so we can tailor the session accordingly."
  }
];
