export type User = {
  id: string;
  name: string;
  email?: string;
};

export type Message = {
  id: string;
  content: string;
  translated_content?: string | null;
  user_id: string;
  created_at: string;
  role: 'user' | 'host';
  session_id: string;
};

export type Session = {
  id: string;
  created_at: string;
  user_id?: string;
  status: 'active' | 'closed';
};
