import { useUpdateUserPreferences, useUpdateUserProfile, useUserPreferences, useUserProfile } from '@/api/user-service';
import AdminLayout from '@/components/admin/AdminLayout';
import { ListSkeleton } from '@/components/Skeleton';
import { Toast } from '@/components/Toast';
import { Save, Settings, User } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function UserProfile() {
  const [toast, setToast] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Dados do perfil
  const { data: profile, isLoading: profileLoading, error: profileError } = useUserProfile();
  const { mutateAsync: updateProfile, isPending: profileUpdating } = useUpdateUserProfile();
  
  // Dados das preferências
  const { data: preferences, isLoading: preferencesLoading, error: preferencesError } = useUserPreferences();
  const { mutateAsync: updatePreferences, isPending: preferencesUpdating } = useUpdateUserPreferences();

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: ''
    }
  });

  const [preferencesData, setPreferencesData] = useState({
    propertyTypes: [] as string[],
    priceRange: {
      min: 0,
      max: 1000000
    },
    location: {
      city: '',
      district: '',
      radius: 10
    },
    bedrooms: {
      min: 1,
      max: 5
    },
    bathrooms: {
      min: 1,
      max: 3
    },
    notifications: {
      email: true,
      sms: false,
      push: true
    }
  });

  // Inicializar dados quando carregados
  useEffect(() => {
    if (profile) {
      setProfileData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        address: {
          street: profile.address?.street || '',
          city: profile.address?.city || '',
          postalCode: profile.address?.postalCode || '',
          country: profile.address?.country || ''
        }
      });
    }
  }, [profile]);

  useEffect(() => {
    if (preferences) {
      setPreferencesData({
        propertyTypes: preferences.propertyTypes || [],
        priceRange: preferences.priceRange ? {
          min: preferences.priceRange.min ?? 0,
          max: preferences.priceRange.max ?? 1000000
        } : { min: 0, max: 1000000 },
        location: preferences.location ? {
          city: preferences.location.city ?? '',
          district: preferences.location.district ?? '',
          radius: preferences.location.radius ?? 10
        } : { city: '', district: '', radius: 10 },
        bedrooms: preferences.bedrooms ? {
          min: preferences.bedrooms.min ?? 1,
          max: preferences.bedrooms.max ?? 5
        } : { min: 1, max: 5 },
        bathrooms: preferences.bathrooms ? {
          min: preferences.bathrooms.min ?? 1,
          max: preferences.bathrooms.max ?? 3
        } : { min: 1, max: 3 },
        notifications: preferences.notifications ? {
          email: preferences.notifications.email ?? true,
          sms: preferences.notifications.sms ?? false,
          push: preferences.notifications.push ?? true
        } : { email: true, sms: false, push: true }
      });
    }
  }, [preferences]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile(profileData);
      setIsEditing(false);
      setToast('Perfil atualizado com sucesso');
    } catch (error) {
      setToast('Erro ao atualizar perfil');
    }
  };

  const handleSavePreferences = async () => {
    try {
      await updatePreferences(preferencesData);
      setToast('Preferências atualizadas com sucesso');
    } catch (error) {
      setToast('Erro ao atualizar preferências');
    }
  };

  if (profileLoading || preferencesLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <ListSkeleton rows={3} />
        </div>
      </AdminLayout>
    );
  }

  if (profileError || preferencesError) {
    return (
      <AdminLayout>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm font-semibold mb-1">Erro ao carregar dados do perfil</p>
          <p className="text-red-700 text-sm">Verifique a conexão com o serviço de utilizadores.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Meu Perfil</h2>
            <p className="text-gray-600">Gerir informações pessoais e preferências</p>
          </div>
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={profileUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save size={16} />
                  <span>{profileUpdating ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <User size={16} />
                <span>Editar Perfil</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <User size={20} />
              <span>Informações Pessoais</span>
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apelido</label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                <input
                  type="text"
                  value={profileData.address.city}
                  onChange={(e) => setProfileData({ 
                    ...profileData, 
                    address: { ...profileData.address, city: e.target.value }
                  })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Biografia</label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <Settings size={20} />
              <span>Preferências de Pesquisa</span>
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço Mínimo (€)</label>
                <input
                  type="number"
                  value={preferencesData.priceRange.min}
                  onChange={(e) => setPreferencesData({
                    ...preferencesData,
                    priceRange: { ...preferencesData.priceRange, min: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço Máximo (€)</label>
                <input
                  type="number"
                  value={preferencesData.priceRange.max}
                  onChange={(e) => setPreferencesData({
                    ...preferencesData,
                    priceRange: { ...preferencesData.priceRange, max: parseInt(e.target.value) || 1000000 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quartos Mínimos</label>
                <input
                  type="number"
                  value={preferencesData.bedrooms.min}
                  onChange={(e) => setPreferencesData({
                    ...preferencesData,
                    bedrooms: { ...preferencesData.bedrooms, min: parseInt(e.target.value) || 1 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quartos Máximos</label>
                <input
                  type="number"
                  value={preferencesData.bedrooms.max}
                  onChange={(e) => setPreferencesData({
                    ...preferencesData,
                    bedrooms: { ...preferencesData.bedrooms, max: parseInt(e.target.value) || 5 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700 mb-4">Notificações</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferencesData.notifications.email}
                    onChange={(e) => setPreferencesData({
                      ...preferencesData,
                      notifications: { ...preferencesData.notifications, email: e.target.checked }
                    })}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700">Receber notificações por email</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferencesData.notifications.sms}
                    onChange={(e) => setPreferencesData({
                      ...preferencesData,
                      notifications: { ...preferencesData.notifications, sms: e.target.checked }
                    })}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700">Receber notificações por SMS</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferencesData.notifications.push}
                    onChange={(e) => setPreferencesData({
                      ...preferencesData,
                      notifications: { ...preferencesData.notifications, push: e.target.checked }
                    })}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700">Receber notificações push</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSavePreferences}
                disabled={preferencesUpdating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save size={16} />
                <span>{preferencesUpdating ? 'Guardando...' : 'Guardar Preferências'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </AdminLayout>
  );
}
