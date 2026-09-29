// src/pages/AdminCategories.tsx
//
// Admin category management: list, add, rename, and delete categories.
// Delete is blocked if any products still use that category, since
// products.category_id points at it — reassign those products first.

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CategoryRow {
  id: number;
  name: string;
  created_at: string;
}

export default function AdminCategories() {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("categories")
        .select("id, name, created_at")
        .order("name", { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError("Couldn't load categories right now. Please try again shortly.");
        setCategories([]);
      } else {
        setCategories(data ?? []);
      }
      setLoading(false);
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    setAdding(true);
    const { error: insertError } = await supabase
      .from("categories")
      .insert({ name: trimmed });
    setAdding(false);

    if (insertError) {
      showToast("Couldn't add category. Please try again.");
      return;
    }

    setNewName("");
    showToast("Category added");
    setReloadToken((token) => token + 1);
  }

  function startEditing(category: CategoryRow) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  async function handleSaveEdit(id: number) {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    setSavingId(id);
    const { error: updateError } = await supabase
      .from("categories")
      .update({ name: trimmed })
      .eq("id", id);
    setSavingId(null);

    if (updateError) {
      showToast("Couldn't rename category. Please try again.");
      return;
    }

    setCategories((prev) =>
      prev.map((category) =>
        category.id === id ? { ...category, name: trimmed } : category
      )
    );
    cancelEditing();
    showToast("Category renamed");
  }

  async function handleDelete(category: CategoryRow) {
    setDeletingId(category.id);

    // Safety check: refuse to delete a category still in use by products,
    // rather than letting it silently break their category display.
    const { count, error: countError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", category.id);

    if (countError) {
      setDeletingId(null);
      showToast("Couldn't check if this category is in use. Please try again.");
      return;
    }

    if (count && count > 0) {
      setDeletingId(null);
      showToast(
        `${count} product${count === 1 ? "" : "s"} still use "${category.name}" — reassign them to a different category before deleting it.`
      );
      return;
    }

    const confirmed = window.confirm(`Delete category "${category.name}"?`);
    if (!confirmed) {
      setDeletingId(null);
      return;
    }

    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);
    setDeletingId(null);

    if (deleteError) {
      showToast("Couldn't delete category. Please try again.");
      return;
    }

    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    showToast("Category deleted");
  }

  return (
    <AdminLayout title="Categories">
      <p className="text-sm text-muted-foreground">
        Manage the categories customers can browse and filter by.
      </p>

      <form onSubmit={handleAdd} className="mt-6 flex max-w-md gap-2">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New category name"
          aria-label="New category name"
        />
        <Button type="submit" disabled={adding || !newName.trim()} className="gap-1.5 shrink-0">
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </form>

      {loading ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Loading categories…</p>
        </div>
      ) : error ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-7 text-destructive" />
          </span>
          <h2 className="mt-6 text-lg font-semibold">Couldn't load categories</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            Try Again
          </Button>
        </div>
      ) : (
        <div className="mt-6 max-w-2xl overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((category) => {
                const isEditing = editingId === category.id;

                return (
                  <tr key={category.id}>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <span className="font-medium">{category.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={savingId === category.id || !editingName.trim()}
                              onClick={() => handleSaveEdit(category.id)}
                            >
                              <Check className="size-3.5" />
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={cancelEditing}
                            >
                              <X className="size-3.5" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => startEditing(category)}
                            >
                              <Pencil className="size-3.5" />
                              Rename
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={deletingId === category.id}
                              onClick={() => handleDelete(category)}
                            >
                              <Trash2 className="size-3.5" />
                              {deletingId === category.id ? "Checking…" : "Delete"}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
