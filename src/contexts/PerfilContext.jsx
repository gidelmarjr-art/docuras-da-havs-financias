import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

const PerfilContext = createContext(null);

export function PerfilProvider({ children }) {
  const { sessao } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);

  useEffect(() => {
    if (!sessao) { setPerfil(null); setCarregandoPerfil(false); return; }
    setCarregandoPerfil(true);
    supabase.from('perfis').select('*').eq('id', sessao.user.id).single()
      .then(({ data, error }) => { if (!error) setPerfil(data); })
      .finally(() => setCarregandoPerfil(false));
  }, [sessao]);

  const valor = useMemo(() => ({ perfil, carregandoPerfil }), [perfil, carregandoPerfil]);
  return <PerfilContext.Provider value={valor}>{children}</PerfilContext.Provider>;
}

export const usePerfil = () => useContext(PerfilContext);
