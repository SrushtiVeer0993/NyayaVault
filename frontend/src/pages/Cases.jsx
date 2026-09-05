import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Plus, FolderOpen } from 'lucide-react';
import {
  PageHeader, Card, SearchBar, Select, Table, Badge, SeverityBadge,
  Button, Modal, Input, formatDate,
} from '../components/ui';
import { CASE_TYPES, CASE_PRIORITIES, CASE_STATUSES } from '../data/mockData';

export default function Cases() {
  const { state, addCase } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('lastUpdated');
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState({
    title: '', type: CASE_TYPES[0], priority: 'High', status: 'Active',
    description: '', sensitivityLevel: 'Confidential', sections: '',
  });

  const filtered = state.cases
    .filter(c => {
      const matchSearch = !search || c.id.toLowerCase().includes(search.toLowerCase()) || c.title.toLowerCase().includes(search.toLowerCase()) || c.assignedOfficer.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchType = typeFilter === 'All' || c.type === typeFilter;
      const matchPriority = priorityFilter === 'All' || c.priority === priorityFilter;
      return matchSearch && matchStatus && matchType && matchPriority;
    })
    .sort((a, b) => {
      if (sortBy === 'lastUpdated') return new Date(b.lastUpdated) - new Date(a.lastUpdated);
      if (sortBy === 'createdDate') return new Date(b.createdDate) - new Date(a.createdDate);
      if (sortBy === 'priority') {
        const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        return order[a.priority] - order[b.priority];
      }
      if (sortBy === 'documents') return b.documentCount - a.documentCount;
      return 0;
    });

  const handleCreateCase = async () => {
    if (!newCaseForm.title.trim()) return;
    try {
      const c = await addCase({
        title: newCaseForm.title,
        type: newCaseForm.type,
        priority: newCaseForm.priority,
        status: newCaseForm.status,
        description: newCaseForm.description,
        sensitivityLevel: newCaseForm.sensitivityLevel,
        sections: newCaseForm.sections.split(',').map(s => s.trim()).filter(Boolean),
        officers: [state.currentUser.name],
        station: state.currentUser.station,
      });
      setNewCaseOpen(false);
      setNewCaseForm({ title: '', type: CASE_TYPES[0], priority: 'High', status: 'Active', description: '', sensitivityLevel: 'Confidential', sections: '' });
      if (c?.id) {
        navigate(`/cases/${c.id}`);
      }
    } catch (err) {
      alert('Failed to create case: ' + (err.message || 'Unknown error'));
    }
  };

  const priorityVariant = { Critical: 'danger', High: 'warning', Medium: 'medium', Low: 'low' };
  const statusVariant = { Active: 'active', 'Under Investigation': 'info', Closed: 'closed', 'Pending Trial': 'warning', Archived: 'default' };

  const columns = [
    { header: 'Case ID', key: 'id', render: c => <span className="font-mono text-xs text-[#475569]">{c.id}</span> },
    { header: 'Case Title', key: 'title', render: c => (
      <div>
        <div className="font-medium text-[#1E293B] text-sm">{c.title}</div>
        <div className="text-xs text-[#475569]">{c.type}</div>
      </div>
    )},
    { header: 'Officer', key: 'assignedOfficer', render: c => <span className="text-sm">{c.assignedOfficer}</span> },
    { header: 'Priority', key: 'priority', render: c => <Badge variant={priorityVariant[c.priority]}>{c.priority}</Badge> },
    { header: 'Status', key: 'status', render: c => <Badge variant={statusVariant[c.status] || 'default'}>{c.status}</Badge> },
    { header: 'Created', key: 'createdDate', render: c => <span className="text-xs">{formatDate(c.createdDate)}</span> },
    { header: 'Updated', key: 'lastUpdated', render: c => <span className="text-xs">{formatDate(c.lastUpdated)}</span> },
    { header: 'Docs', key: 'documentCount', render: c => <span className="text-xs font-medium">{c.documentCount}</span> },
    { header: 'Evidence', key: 'evidenceCount', render: c => <span className="text-xs font-medium">{c.evidenceCount}</span> },
    { header: 'Actions', key: 'actions', render: c => (
      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); navigate(`/cases/${c.id}`); }}>
        Open
      </Button>
    )},
  ];

  return (
    <div className="p-5">
      <PageHeader
        title="Case Management"
        subtitle={`${filtered.length} of ${state.cases.length} cases`}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Cases' }]}
        actions={
          <Button variant="primary" onClick={() => setNewCaseOpen(true)}>
            <Plus size={14} />
            New Case
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by ID, title, officer..." className="w-64" />
          <Select
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={['All', ...CASE_STATUSES]}
            className="w-40"
          />
          <Select
            label="Type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={['All', ...CASE_TYPES]}
            className="w-44"
          />
          <Select
            label="Priority"
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={['All', ...CASE_PRIORITIES]}
            className="w-36"
          />
          <Select
            label="Sort By"
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'lastUpdated', label: 'Last Updated' },
              { value: 'createdDate', label: 'Created Date' },
              { value: 'priority', label: 'Priority' },
              { value: 'documents', label: 'Documents' },
            ]}
            className="w-40"
          />
        </div>
      </Card>

      {/* Cases Table */}
      <Card noPad>
        <Table
          columns={columns}
          data={filtered}
          onRowClick={c => navigate(`/cases/${c.id}`)}
          emptyMessage="No cases found matching your filters"
        />
      </Card>

      {/* New Case Modal */}
      <Modal isOpen={newCaseOpen} onClose={() => setNewCaseOpen(false)} title="Create New Case" size="lg">
        <div className="p-5 space-y-4">
          <Input
            label="Case Title *"
            value={newCaseForm.title}
            onChange={v => setNewCaseForm(f => ({ ...f, title: v }))}
            placeholder="e.g., Cyber Fraud - Online Banking Breach"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Case Type"
              value={newCaseForm.type}
              onChange={v => setNewCaseForm(f => ({ ...f, type: v }))}
              options={CASE_TYPES}
            />
            <Select
              label="Priority"
              value={newCaseForm.priority}
              onChange={v => setNewCaseForm(f => ({ ...f, priority: v }))}
              options={CASE_PRIORITIES}
            />
            <Select
              label="Status"
              value={newCaseForm.status}
              onChange={v => setNewCaseForm(f => ({ ...f, status: v }))}
              options={CASE_STATUSES}
            />
            <Select
              label="Sensitivity"
              value={newCaseForm.sensitivityLevel}
              onChange={v => setNewCaseForm(f => ({ ...f, sensitivityLevel: v }))}
              options={['Public', 'Restricted', 'Confidential', 'Top Secret']}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Description</label>
            <textarea
              value={newCaseForm.description}
              onChange={e => setNewCaseForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief case description..."
              rows={3}
              className="w-full border border-[#E2E8F0] rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F2747] resize-none"
            />
          </div>
          <Input
            label="Legal Sections (comma-separated)"
            value={newCaseForm.sections}
            onChange={v => setNewCaseForm(f => ({ ...f, sections: v }))}
            placeholder="e.g., IPC 420, IT Act 66C"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setNewCaseOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateCase} disabled={!newCaseForm.title.trim()}>
              <FolderOpen size={14} />
              Create Case
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
