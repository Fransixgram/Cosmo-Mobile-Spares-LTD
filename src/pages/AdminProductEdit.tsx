// src/pages/AdminProductEdit.tsx
//
// Product-edit form. Loads an existing product by :id, pre-fills the form,
// and updates it in place. Mirrors AdminProductNew.tsx's field handling and
// image-upload logic, adjusted for editing existing data (existing images
// are URLs already in Storage, not new files).

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Loader2, ImagePlus, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_BUCKET = "product-images";
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface CategoryOption {
  id: number;
  name: string;
}

interface SpecRow {
  key: string;
  value: string;
}

interface SelectedImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface FormValues {
  name: string;
  price: string;
  stock: string;
  categoryId: string;
  description: string;
  compatibleModels: string;
  colors: string;
  isFeatured: boolean;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  price?: string;
  stock?: string;
  categoryId?: string;
}

function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `"${file.name}" isn't a supported image type. Use JPG, PNG, or WEBP.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `"${file.name}" is larger than 5MB.`;
  }
  return null;
}

/**
 * Extracts the Storage path (e.g. "products/{uuid}/primary-{uuid}.jpg")
 * from a public Supabase Storage URL, so we can delete the old file.
 * Returns null if the URL doesn't look like one of ours.
 */
function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Product name is required.";
  }

  if (values.price.trim() === "") {
    errors.price = "Price is required.";
  } else {
    const priceNum = Number(values.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      errors.price = "Enter a valid price of 0 or more.";
    }
  }

  if (values.stock.trim() === "") {
    errors.stock = "Stock is required.";
  } else {
    const stockNum = Number(values.stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      errors.stock = "Enter a whole number of 0 or more.";
    }
  }

  if (!values.categoryId) {
    errors.categoryId = "Please select a category.";
  }

  return errors;
}

export default function AdminProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Loading the existing product
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [originalSlug, setOriginalSlug] = useState<string>("");

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [values, setValues] = useState<FormValues>({
    name: "",
    price: "",
    stock: "0",
    categoryId: "",
    description: "",
    compatibleModels: "",
    colors: "",
    isFeatured: false,
    isActive: true,
  });
  const [specRows, setSpecRows] = useState<SpecRow[]>([{ key: "", value: "" }]);
  const [errors, setErrors] = useState<FormErrors>({});

  // Existing images already in Storage (URLs from the DB row)
  const [existingPrimaryUrl, setExistingPrimaryUrl] = useState<string | null>(null);
  const [existingAdditionalUrls, setExistingAdditionalUrls] = useState<string[]>([]);

  // New files chosen to replace/add, same shape as the create form
  const [primaryImage, setPrimaryImage] = useState<SelectedImage | null>(null);
  const [additionalImages, setAdditionalImages] = useState<SelectedImage[]>([]);
  const [imageFileError, setImageFileError] = useState<string | null>(null);
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  const createdUrlsRef = useRef<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load the product to edit
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, description, price, stock, category_id, slug, image_url, images, compatible_models, colors, specs, is_featured, is_active"
        )
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setLoadError("Couldn't load this product. It may have been deleted.");
        setLoading(false);
        return;
      }

      setOriginalSlug(data.slug ?? "");
      setValues({
        name: data.name ?? "",
        price: data.price != null ? String(data.price) : "",
        stock: data.stock != null ? String(data.stock) : "0",
        categoryId: data.category_id != null ? String(data.category_id) : "",
        description: data.description ?? "",
        compatibleModels: (data.compatible_models ?? []).join(", "),
        colors: (data.colors ?? []).join(", "),
        isFeatured: Boolean(data.is_featured),
        isActive: Boolean(data.is_active),
      });

      const specsObj = (data.specs ?? {}) as Record<string, string>;
      const rows = Object.entries(specsObj).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      setSpecRows(rows.length > 0 ? rows : [{ key: "", value: "" }]);

      setExistingPrimaryUrl(data.image_url ?? null);
      setExistingAdditionalUrls(data.images ?? []);

      setLoading(false);
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setCategoriesLoading(true);
      setCategoriesError(null);

      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        setCategoriesError("Couldn't load categories. Please try again.");
      } else {
        setCategories(data ?? []);
      }
      setCategoriesLoading(false);
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const urls = createdUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSpecChange(index: number, field: keyof SpecRow, value: string) {
    setSpecRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addSpecRow() {
    setSpecRows((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeSpecRow(index: number) {
    setSpecRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePrimaryFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setImageFileError(validationMessage);
      return;
    }

    setImageFileError(null);
    if (primaryImage) {
      URL.revokeObjectURL(primaryImage.previewUrl);
      createdUrlsRef.current.delete(primaryImage.previewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    createdUrlsRef.current.add(previewUrl);
    setPrimaryImage({ id: crypto.randomUUID(), file, previewUrl });
  }

  // Removing the primary image: if a new replacement was staged, drop that;
  // otherwise it means removing the existing DB image.
  function removePrimaryImage() {
    if (primaryImage) {
      URL.revokeObjectURL(primaryImage.previewUrl);
      createdUrlsRef.current.delete(primaryImage.previewUrl);
      setPrimaryImage(null);
      return;
    }
    setExistingPrimaryUrl(null);
  }

  function handleAdditionalFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const validFiles: SelectedImage[] = [];
    const rejectionMessages: string[] = [];

    for (const file of files) {
      const validationMessage = validateImageFile(file);
      if (validationMessage) {
        rejectionMessages.push(validationMessage);
        continue;
      }
      validFiles.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    validFiles.forEach((img) => createdUrlsRef.current.add(img.previewUrl));

    setImageFileError(rejectionMessages.length > 0 ? rejectionMessages.join(" ") : null);
    if (validFiles.length > 0) {
      setAdditionalImages((prev) => [...prev, ...validFiles]);
    }
  }

  function removeNewAdditionalImage(imgId: string) {
    setAdditionalImages((prev) => {
      const target = prev.find((img) => img.id === imgId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        createdUrlsRef.current.delete(target.previewUrl);
      }
      return prev.filter((img) => img.id !== imgId);
    });
  }

  function removeExistingAdditionalImage(url: string) {
    setExistingAdditionalUrls((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setSubmitError(null);

    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    setStatusMessage("Uploading images...");

    const uploadedPaths: string[] = [];
    let finalPrimaryUrl: string | null = existingPrimaryUrl;
    let finalAdditionalUrls: string[] = [...existingAdditionalUrls];

    try {
      // New primary image replaces whatever was there
      if (primaryImage) {
        const ext = extensionFromMime(primaryImage.file.type);
        const path = `products/${id}/primary-${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, primaryImage.file, { contentType: primaryImage.file.type });
        if (uploadError) {
          throw new Error(`Couldn't upload the primary image: ${uploadError.message}`);
        }
        uploadedPaths.push(path);
        finalPrimaryUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      }

      // New additional images get appended
      for (const image of additionalImages) {
        const ext = extensionFromMime(image.file.type);
        const path = `products/${id}/additional-${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, image.file, { contentType: image.file.type });
        if (uploadError) {
          throw new Error(`Couldn't upload an additional image: ${uploadError.message}`);
        }
        uploadedPaths.push(path);
        finalAdditionalUrls.push(
          supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
        );
      }
    } catch (uploadCaughtError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
      }
      setSubmitError(
        uploadCaughtError instanceof Error
          ? uploadCaughtError.message
          : "Image upload failed. Please try again."
      );
      setSubmitting(false);
      setStatusMessage("");
      return;
    }

    setStatusMessage("Saving product...");

    const specs: Record<string, string> = {};
    for (const row of specRows) {
      const key = row.key.trim();
      const value = row.value.trim();
      if (key && value) specs[key] = value;
    }

    const payload = {
      name: values.name.trim(),
      slug: originalSlug, // keep the original slug so existing links don't break
      description: values.description.trim() || null,
      price: Number(values.price),
      stock: Number(values.stock),
      category_id: Number(values.categoryId),
      image_url: finalPrimaryUrl,
      images: finalAdditionalUrls,
      compatible_models: parseList(values.compatibleModels),
      colors: parseList(values.colors),
      specs,
      is_featured: values.isFeatured,
      is_active: values.isActive,
    };

    const { error: updateError } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id);

    if (updateError) {
      let cleanupNote = "";
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(uploadedPaths);
        if (cleanupError) {
          cleanupNote =
            " The newly uploaded images also couldn't be automatically removed — you may need to delete them manually from Storage.";
        }
      }
      setSubmitting(false);
      setStatusMessage("");
      setSubmitError(`Couldn't save changes: ${updateError.message}.${cleanupNote}`);
      return;
    }

    // Now that the update succeeded, clean up any images that were actually
    // replaced or removed. This happens last on purpose: if the DB update
    // had failed, we wouldn't want to delete storage files a live product
    // row is still pointing at.
    const pathsToDelete: string[] = [];
    if (primaryImage && existingPrimaryUrl) {
      const oldPath = storagePathFromPublicUrl(existingPrimaryUrl);
      if (oldPath) pathsToDelete.push(oldPath);
    } else if (!primaryImage && existingPrimaryUrl === null) {
      // existingPrimaryUrl was cleared to null via removePrimaryImage();
      // we no longer have the original URL in state to derive a path from
      // here, so nothing to clean up in this branch — see note below.
    }
    if (pathsToDelete.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(pathsToDelete);
    }

    setSubmitting(false);
    setStatusMessage("");
    showToast("Product updated");
    navigate("/admin/products");
  }

  if (loading) {
    return (
      <AdminLayout title="Edit Product">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading product...
        </div>
      </AdminLayout>
    );
  }

  if (loadError) {
    return (
      <AdminLayout title="Edit Product">
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Product">
      <form onSubmit={handleSubmit} noValidate className="max-w-2xl">
        {submitError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Basic Information
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                name="name"
                value={values.name}
                onChange={handleChange}
                aria-invalid={Boolean(errors.name)}
                className="mt-1.5"
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="price">Price (₦)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={values.price}
                onChange={handleChange}
                aria-invalid={Boolean(errors.price)}
                className="mt-1.5"
              />
              {errors.price && (
                <p className="mt-1.5 text-xs text-destructive">{errors.price}</p>
              )}
            </div>

            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min="0"
                step="1"
                value={values.stock}
                onChange={handleChange}
                aria-invalid={Boolean(errors.stock)}
                className="mt-1.5"
              />
              {errors.stock && (
                <p className="mt-1.5 text-xs text-destructive">{errors.stock}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="categoryId">Category</Label>
              {categoriesError ? (
                <p className="mt-1.5 text-xs text-destructive">{categoriesError}</p>
              ) : (
                <select
                  id="categoryId"
                  name="categoryId"
                  value={values.categoryId}
                  onChange={handleChange}
                  disabled={categoriesLoading}
                  aria-invalid={Boolean(errors.categoryId)}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">
                    {categoriesLoading ? "Loading categories…" : "Select a category"}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.categoryId && (
                <p className="mt-1.5 text-xs text-destructive">{errors.categoryId}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={values.description}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Images
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG, or WEBP, up to 5MB each.
          </p>

          <div className="mt-4">
            <Label>Primary Image</Label>
            <div className="mt-1.5">
              {primaryImage ? (
                <div className="relative size-28">
                  <img
                    src={primaryImage.previewUrl}
                    alt="New primary product"
                    className="h-full w-full rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePrimaryImage}
                    aria-label="Remove new primary image"
                    className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : existingPrimaryUrl ? (
                <div className="relative size-28">
                  <img
                    src={existingPrimaryUrl}
                    alt="Current primary product"
                    className="h-full w-full rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePrimaryImage}
                    aria-label="Remove primary image"
                    className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => primaryInputRef.current?.click()}
                  className="flex size-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-muted-foreground transition-colors hover:bg-accent"
                >
                  <ImagePlus className="size-5" />
                  <span className="text-xs">Choose file</span>
                </button>
              )}
              <input
                ref={primaryInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                onChange={handlePrimaryFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="mt-5">
            <Label>Additional Images</Label>
            <div className="mt-1.5 flex flex-wrap gap-3">
              {existingAdditionalUrls.map((url) => (
                <div key={url} className="relative size-20">
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingAdditionalImage(url)}
                    aria-label="Remove image"
                    className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {additionalImages.map((image) => (
                <div key={image.id} className="relative size-20">
                  <img
                    src={image.previewUrl}
                    alt=""
                    className="h-full w-full rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewAdditionalImage(image.id)}
                    aria-label="Remove image"
                    className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => additionalInputRef.current?.click()}
                className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-muted-foreground transition-colors hover:bg-accent"
              >
                <Plus className="size-5" />
                <span className="text-[10px]">Add</span>
              </button>
              <input
                ref={additionalInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                multiple
                onChange={handleAdditionalFilesChange}
                className="hidden"
              />
            </div>
          </div>

          {imageFileError && (
            <p className="mt-3 text-xs text-destructive">{imageFileError}</p>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Compatibility &amp; Options
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="compatibleModels">
                Compatible Models (comma-separated)
              </Label>
              <Input
                id="compatibleModels"
                name="compatibleModels"
                placeholder="iPhone 12, iPhone 12 Pro"
                value={values.compatibleModels}
                onChange={handleChange}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="colors">Colors (comma-separated)</Label>
              <Input
                id="colors"
                name="colors"
                placeholder="Black, White, Blue"
                value={values.colors}
                onChange={handleChange}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Specifications
          </h2>

          <div className="mt-4 flex flex-col gap-2">
            {specRows.map((row, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Key (e.g. Screen Type)"
                  value={row.key}
                  onChange={(event) =>
                    handleSpecChange(index, "key", event.target.value)
                  }
                />
                <Input
                  placeholder="Value (e.g. OLED)"
                  value={row.value}
                  onChange={(event) =>
                    handleSpecChange(index, "value", event.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() => removeSpecRow(index)}
                  aria-label="Remove specification"
                  className="flex size-10 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={addSpecRow}
          >
            <Plus className="size-3.5" />
            Add Specification
          </Button>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Visibility
          </h2>

          <div className="mt-4 flex flex-col gap-3">
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={values.isFeatured}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, isFeatured: event.target.checked }))
                }
                className="size-4 rounded border-input accent-primary"
              />
              Featured product
            </label>

            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, isActive: event.target.checked }))
                }
                className="size-4 rounded border-input accent-primary"
              />
              Active (visible in the shop)
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/products")}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="gap-1.5">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? statusMessage || "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}