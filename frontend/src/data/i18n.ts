import type { Lang } from '../types/platform';

export const languageOptions: {id: Lang;label: string;native: string;short: string;}[] = [
{ id: 'en', label: 'English', native: 'English', short: 'EN' },
{ id: 'rw', label: 'Kinyarwanda', native: 'Ikinyarwanda', short: 'RW' },
{ id: 'fr', label: 'French', native: 'Français', short: 'FR' }];


export type TKey =
'home' | 'diagnostic' | 'learningPath' | 'results' | 'credentials' | 'profile' | 'verify' | 'progress' |
'modules' | 'assessment' | 'students' | 'learning' | 'tools' | 'records' | 'content' | 'logout' |
'learn' | 'awards' | 'goodMorning' | 'goodAfternoon' | 'goodEvening' | 'goodNight' |
'invites' | 'people' | 'notifications' | 'settings';

export const dictionary: Record<Lang, Record<TKey, string>> = {
  en: {
    home: 'Home', diagnostic: 'Diagnostic', learningPath: 'Learning path', results: 'Results', credentials: 'Credentials', profile: 'Profile',
    verify: 'Verify', progress: 'Progress', modules: 'Modules', assessment: 'Assessment', students: 'Students', learning: 'Learning',
    tools: 'Tools', records: 'Records', content: 'Content', logout: 'Log out', learn: 'Learn', awards: 'Awards',
    goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening', goodNight: 'Good night',
    invites: 'Invites', people: 'People', notifications: 'Notifications', settings: 'Settings'
  },
  rw: {
    home: 'Ahabanza', diagnostic: 'Isuzuma', learningPath: 'Inzira yo kwiga', results: 'Ibisubizo', credentials: 'Impamyabushobozi', profile: 'Umwirondoro',
    verify: 'Genzura', progress: 'Aho ugeze', modules: 'Amasomo', assessment: 'Isuzuma', students: 'Abanyeshuri', learning: 'Kwiga',
    tools: 'Ibikoresho', records: 'Inyandiko', content: 'Ibirimo', logout: 'Sohoka', learn: 'Iga', awards: 'Ibihembo',
    goodMorning: 'Mwaramutse', goodAfternoon: 'Mwiriwe', goodEvening: 'Mwiriwe', goodNight: 'Muramuke',
    invites: 'Ubutumire', people: 'Abantu', notifications: 'Amatangazo', settings: 'Igenamiterere'
  },
  fr: {
    home: 'Accueil', diagnostic: 'Diagnostic', learningPath: 'Parcours', results: 'Résultats', credentials: 'Certificats', profile: 'Profil',
    verify: 'Vérifier', progress: 'Progression', modules: 'Modules', assessment: 'Évaluation', students: 'Étudiants', learning: 'Apprendre',
    tools: 'Outils', records: 'Historique', content: 'Contenu', logout: 'Déconnexion', learn: 'Apprendre', awards: 'Badges',
    goodMorning: 'Bonjour', goodAfternoon: 'Bon après-midi', goodEvening: 'Bonsoir', goodNight: 'Bonne nuit',
    invites: 'Invitations', people: 'Personnes', notifications: 'Notifications', settings: 'Paramètres'
  }
};