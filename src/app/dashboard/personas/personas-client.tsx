"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  Star,
  Sparkles,
  Target,
  MessageSquareQuote,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRelativeTime } from "@/lib/utils";
import type { PersonaRow } from "@/lib/supabase/queries";
import {
  createPersonaAction,
  deletePersonaAction,
  fetchPersonasAction,
  setDefaultPersonaAction,
  updatePersonaAction,
} from "./actions";

export function PersonasClient({ initialPersonas }: { initialPersonas: PersonaRow[] }) {
  const [personas, setPersonas] = useState<PersonaRow[]>(initialPersonas);
  const [editing, setEditing] = useState<PersonaRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();

  async function refresh() {
    const fresh = await fetchPersonasAction();
    setPersonas(fresh);
  }

  function openNew() {
    setEditing({
      id: "",
      user_id: "",
      name: "",
      demographics: null,
      desires: "",
      problems: "",
      voice_of_customer: "",
      notes: null,
      is_default: false,
      created_at: "",
      updated_at: "",
    });
    setCreating(true);
  }

  function openEdit(p: PersonaRow) {
    setEditing(p);
    setCreating(false);
  }

  async function handleSave(payload: {
    name: string;
    demographics: string;
    desires: string;
    problems: string;
    voice_of_customer: string;
    notes: string;
    is_default: boolean;
  }) {
    startTransition(async () => {
      if (!editing) return;
      if (creating) {
        const res = await createPersonaAction(payload);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Persona created");
      } else {
        const res = await updatePersonaAction(editing.id, payload);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Persona saved");
      }
      setEditing(null);
      setCreating(false);
      await refresh();
    });
  }

  async function handleSetDefault(id: string) {
    startTransition(async () => {
      const res = await setDefaultPersonaAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Default persona updated");
      await refresh();
    });
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete persona "${name}"?`)) return;
    startTransition(async () => {
      const res = await deletePersonaAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Persona deleted");
      await refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {personas.length === 0
            ? "No personas yet."
            : `${personas.length} persona${personas.length === 1 ? "" : "s"} configured.`}
        </p>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          New persona
        </Button>
      </div>

      {editing && (
        <PersonaEditor
          persona={editing}
          isCreating={creating}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={handleSave}
        />
      )}

      {personas.length === 0 && !editing ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-secondary">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-medium">Build your first persona</h3>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              A great ICP captures three things: what your customer <b>desires</b>, what
              <b> problems</b> they face, and the <b>voice</b> they use when they talk about it.
              Atlas will weave all three into every piece of copy it generates.
            </p>
            <Button className="mt-4" onClick={openNew}>
              <Sparkles className="h-4 w-4" />
              Create your first persona
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {personas.map((p) => (
            <PersonaCard
              key={p.id}
              persona={p}
              onEdit={() => openEdit(p)}
              onSetDefault={() => handleSetDefault(p.id)}
              onDelete={() => handleDelete(p.id, p.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PersonaCard({
  persona,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  persona: PersonaRow;
  onEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-muted-foreground" />
              {persona.name}
              {persona.is_default && (
                <Badge variant="default" className="text-[10px]">
                  <Star className="mr-1 h-3 w-3" /> Default
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Updated {formatRelativeTime(persona.updated_at)}
              {persona.demographics && <> · {persona.demographics.split("\n")[0].slice(0, 80)}</>}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!persona.is_default && (
              <Button variant="outline" size="sm" onClick={onSetDefault}>
                <Star className="h-4 w-4" />
                Set default
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FieldPreview
            icon={<Target className="h-3.5 w-3.5" />}
            label="Desires"
            text={persona.desires}
            empty="What they want to achieve."
          />
          <FieldPreview
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Problems"
            text={persona.problems}
            empty="Pain points they're trying to escape."
          />
          <FieldPreview
            icon={<MessageSquareQuote className="h-3.5 w-3.5" />}
            label="Voice of customer"
            text={persona.voice_of_customer}
            empty="Phrases they actually use."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FieldPreview({
  icon,
  label,
  text,
  empty,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  empty: string;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
        {text?.trim() ? text : <span className="italic text-muted-foreground/70">{empty}</span>}
      </p>
    </div>
  );
}

function PersonaEditor({
  persona,
  isCreating,
  onCancel,
  onSave,
}: {
  persona: PersonaRow;
  isCreating: boolean;
  onCancel: () => void;
  onSave: (payload: {
    name: string;
    demographics: string;
    desires: string;
    problems: string;
    voice_of_customer: string;
    notes: string;
    is_default: boolean;
  }) => void;
}) {
  const [name, setName] = useState(persona.name);
  const [demographics, setDemographics] = useState(persona.demographics ?? "");
  const [desires, setDesires] = useState(persona.desires ?? "");
  const [problems, setProblems] = useState(persona.problems ?? "");
  const [voice, setVoice] = useState(persona.voice_of_customer ?? "");
  const [notes, setNotes] = useState(persona.notes ?? "");
  const [isDefault, setIsDefault] = useState(persona.is_default);
  const [saving, setSaving] = useState(false);

  function submit() {
    if (!name.trim()) {
      toast.error("Persona name is required.");
      return;
    }
    setSaving(true);
    onSave({
      name: name.trim(),
      demographics: demographics.trim(),
      desires: desires.trim(),
      problems: problems.trim(),
      voice_of_customer: voice.trim(),
      notes: notes.trim(),
      is_default: isDefault,
    });
    // Saving state will resolve when parent closes dialog via revalidate.
    setTimeout(() => setSaving(false), 1500);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              {isCreating ? "New persona" : `Editing · ${persona.name}`}
            </CardTitle>
            <CardDescription>
              Fill in the three ICP sections. Each one sharpens how Atlas writes.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Save persona
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="persona-name">Persona name *</Label>
            <Input
              id="persona-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NYC SaaS founders"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona-demo">Demographics (optional)</Label>
            <Input
              id="persona-demo"
              value={demographics}
              onChange={(e) => setDemographics(e.target.value)}
              placeholder="Age 30–45, NYC, Series A–C SaaS founders"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="persona-desires" className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" /> Desires
            </Label>
            <Textarea
              id="persona-desires"
              value={desires}
              onChange={(e) => setDesires(e.target.value)}
              placeholder="What they want to achieve. Goals, ambitions, the better future they're reaching for."
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona-problems" className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Problems
            </Label>
            <Textarea
              id="persona-problems"
              value={problems}
              onChange={(e) => setProblems(e.target.value)}
              placeholder="Their pain points. Frustrations, fears, blockers. Move- AWAY-from-pain is usually stronger than toward-desire."
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona-voice" className="flex items-center gap-1.5">
              <MessageSquareQuote className="h-3.5 w-3.5" /> Voice of customer
            </Label>
            <Textarea
              id="persona-voice"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              placeholder={`Phrases they actually say. Survey past customers, scan forums, read reviews.\n\nExample:\n"we keep adding tools but nothing gets faster"`}
              rows={5}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="persona-notes">Internal notes (optional)</Label>
          <Textarea
            id="persona-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else Atlas should keep in mind for this persona."
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-4 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="persona-default" className="text-sm">
              Use as default for the Copy generator
            </Label>
            <p className="text-xs text-muted-foreground">
              When set, this persona is pre-selected on every new generation.
            </p>
          </div>
          <input
            id="persona-default"
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-foreground"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Dialog import kept available for future modal-based editing.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void Dialog;
