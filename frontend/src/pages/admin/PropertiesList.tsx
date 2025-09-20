import { useCreateProperty, useDeleteProperty, useProperties, useUpdateProperty } from '@/api/queries';
import PropertyForm from '@/components/forms/PropertyForm';
import Modal from '@/components/Modal';
import { ListSkeleton } from '@/components/Skeleton';
import { Toast } from '@/components/Toast';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

export default function PropertiesList() {
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState(10);
  const query = useProperties({ q, cursor, limit, sortBy: 'createdAt', sortOrder: 'desc' });
  const { mutateAsync: remove, isPending } = useDeleteProperty();
  const { mutateAsync: create, isPending: creating } = useCreateProperty();
  const { mutateAsync: update, isPending: updating } = useUpdateProperty();
  const rows = useMemo(() => query.data?.data ?? [], [query.data]);
  const pagination = query.data?.pagination;
  const [toast, setToast] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<{ open: boolean; property?: any }>({ open: false });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin · Imóveis</h1>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>Novo imóvel</button>
      </div>

      {query.isLoading ? (
        <ListSkeleton rows={5} />
      ) : query.error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-left">
          <p className="text-red-700 text-sm font-semibold mb-1">Falha ao carregar imóveis</p>
          <p className="text-red-700 text-sm">Verifica a configuração da API em <code>VITE_API_URL</code> e a rota <code>/api/v1/properties</code>.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {rows.length === 0 && (
            <div className="p-6 text-center text-slate-600">Sem imóveis. Clique em &quot;Novo imóvel&quot; para criar.</div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar..." className="input max-w-xs" />
            <select className="input" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button className="btn" onClick={() => query.refetch()}>Atualizar</button>
          </div>
          <table className="min-w-full border divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Título</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Localização</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Preço</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">{p.title}</td>
                  <td className="px-4 py-2">{p.location}</td>
                  <td className="px-4 py-2">R$ {Number(p.price ?? 0).toLocaleString('pt-PT')}</td>
                  <td className="px-4 py-2">
                    <Link to={`/admin/properties/${p.id}/images`} className="btn btn-outline">
                      Gerir Imagens
                    </Link>
                    <button
                      className="btn ml-2"
                      onClick={() => setEdit({ open: true, property: p })}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-danger ml-2"
                      disabled={isPending}
                      onClick={async () => {
                        if (!confirm('Eliminar este imóvel?')) return;
                        await remove(p.id);
                        setToast('Imóvel eliminado');
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between py-3">
            <button
              className="btn btn-outline"
              disabled={!pagination?.nextCursor}
              onClick={() => setCursor(pagination?.nextCursor || undefined)}
            >
              Próxima página
            </button>
            {pagination && (
              <span className="text-sm text-slate-600">
                {rows.length} / {pagination.totalEstimate ?? '—'}
              </span>
            )}
          </div>
        </div>
      )}
      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />

      <Modal open={createOpen} title="Novo imóvel" onClose={() => setCreateOpen(false)}>
        <PropertyForm
          submitting={creating}
          onSubmit={async (values) => {
            await create(values as any);
            setCreateOpen(false);
            setToast('Imóvel criado');
          }}
        />
      </Modal>

      <Modal open={edit.open} title="Editar imóvel" onClose={() => setEdit({ open: false })}>
        {edit.property && (
          <PropertyForm
            initial={edit.property}
            submitting={updating}
            onSubmit={async (values) => {
              await update({ id: edit.property!.id, payload: values as any });
              setEdit({ open: false });
              setToast('Imóvel atualizado');
            }}
          />
        )}
      </Modal>
    </div>
  );
}


