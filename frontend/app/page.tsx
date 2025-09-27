"use client";

import { useState } from "react";
import Image from "next/image";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const defaultForm = {
  seller_id: "",
  title: "",
  price: "",
  shipping_mode: "me2",
  listing_type_id: "gold_special",
  category_id: "MLA5725",
  has_video: false,
  pictures_qty: 1,
  shipping_free_shipping: false,
  shipping_local_pick_up: true,
  base_price: "",
  original_price: "",
};

export default function Home() {
  const [formValues, setFormValues] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    prediction: string;
    probability_new: number;
    probability_used: number;
    text_score: number;
  } | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = event.currentTarget;
    const { name, value, type } = target;
    const nextValue = type === "checkbox" ? (target as HTMLInputElement).checked : value;
    setFormValues((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const payload = {
      seller_id: Number(formValues.seller_id),
      title: formValues.title,
      price: Number(formValues.price),
      shipping_mode: formValues.shipping_mode,
      listing_type_id: formValues.listing_type_id,
      category_id: formValues.category_id,
      has_video: formValues.has_video,
      pictures_qty: Number(formValues.pictures_qty),
      shipping_free_shipping: formValues.shipping_free_shipping,
      shipping_local_pick_up: formValues.shipping_local_pick_up,
      base_price: formValues.base_price ? Number(formValues.base_price) : null,
      original_price: formValues.original_price ? Number(formValues.original_price) : null,
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/predict`, payload);
      setResult(response.data);
    } catch (err: any) {
      const message = err?.response?.data?.detail || "Error invoking prediction API.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormValues(defaultForm);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--meli-primary)] border-b border-[var(--meli-border)]">
        <div className="meli-container flex items-center gap-6 py-4">
          <Image
            src="/mercadolibre_logo.svg"
            alt="Mercado Libre"
            width={180}
            height={48}
            priority
          />
          <div>
            <h1 className="meli-title">Predicción de Condición de Item</h1>
            <p className="meli-subtitle">
              Ingresa los datos del listado para estimar si se ofrecerá como nuevo o usado.
            </p>
          </div>
        </div>
      </header>

      <main className="meli-container grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 py-8">
        <section className="meli-card p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--meli-dark)]">Información del listado</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-sm text-[var(--meli-dark)]">Título</label>
              <input
                required
                name="title"
                value={formValues.title}
                onChange={handleChange}
                className="border border-[var(--meli-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--meli-primary)]"
                placeholder="Ej: Galaxy A55 5G 256GB"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-sm text-[var(--meli-dark)]">Seller ID</label>
              <input
                required
                type="number"
                min={1}
                name="seller_id"
                value={formValues.seller_id}
                onChange={handleChange}
                className="border border-[var(--meli-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--meli-primary)]"
                placeholder="Ej: 74952096"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-sm text-[var(--meli-dark)]">Precio</label>
              <input
                required
                type="number"
                min={0}
                name="price"
                value={formValues.price}
                onChange={handleChange}
                className="border border-[var(--meli-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--meli-primary)]"
                placeholder="Ej: 349999"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-sm text-[var(--meli-dark)]">Categoría</label>
              <input
                required
                name="category_id"
                value={formValues.category_id}
                onChange={handleChange}
                className="border border-[var(--meli-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--meli-primary)]"
                placeholder="Ej: MLA5725"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-sm text-[var(--meli-dark)]">Modalidad de envío</label>
              <select
                name="shipping_mode"
                value={formValues.shipping_mode}
                onChange={handleChange}
                className="border border-[var(--meli-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--meli-primary)]"
              >
                <option value="me2">Mercado Envíos (me2)</option>
                <option value="custom">Personalizado</option>
                <option value="not_specified">No especificado</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-sm text-[var(--meli-dark)]">Tipo de publicación</label>
              <select
                name="listing_type_id"
                value={formValues.listing_type_id}
                onChange={handleChange}
                className="border border-[var(--meli-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--meli-primary)]"
              >
                <option value="gold_special">Gold Special</option>
                <option value="gold_pro">Gold Pro</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronce</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-sm text-[var(--meli-dark)]">Cantidad de fotos</label>
              <input
                type="number"
                min={0}
                name="pictures_qty"
                value={formValues.pictures_qty}
                onChange={handleChange}
                className="border border-[var(--meli-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--meli-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-sm text-[var(--meli-dark)]">Precio base</label>
              <input
                type="number"
                min={0}
                name="base_price"
                value={formValues.base_price}
                onChange={handleChange}
                className="border border-[var(--meli-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--meli-primary)]"
                placeholder="Opcional"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-sm text-[var(--meli-dark)]">Precio original</label>
              <input
                type="number"
                min={0}
                name="original_price"
                value={formValues.original_price}
                onChange={handleChange}
                className="border border-[var(--meli-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--meli-primary)]"
                placeholder="Opcional"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="has_video"
                name="has_video"
                type="checkbox"
                checked={formValues.has_video}
                onChange={handleChange}
                className="h-4 w-4 rounded border-[var(--meli-border)]"
              />
              <label htmlFor="has_video" className="text-sm text-[var(--meli-dark)]">
                Tiene video
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="shipping_free_shipping"
                name="shipping_free_shipping"
                type="checkbox"
                checked={formValues.shipping_free_shipping}
                onChange={handleChange}
                className="h-4 w-4 rounded border-[var(--meli-border)]"
              />
              <label htmlFor="shipping_free_shipping" className="text-sm text-[var(--meli-dark)]">
                Envío gratis
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="shipping_local_pick_up"
                name="shipping_local_pick_up"
                type="checkbox"
                checked={formValues.shipping_local_pick_up}
                onChange={handleChange}
                className="h-4 w-4 rounded border-[var(--meli-border)]"
              />
              <label htmlFor="shipping_local_pick_up" className="text-sm text-[var(--meli-dark)]">
                Retiro en persona disponible
              </label>
            </div>

            <div className="md:col-span-2 flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-[var(--meli-border)] rounded-md text-sm font-semibold text-[var(--meli-dark)] hover:bg-neutral-100"
              >
                Limpiar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="button-primary px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-70"
              >
                {loading ? "Calculando..." : "Calcular"}
              </button>
            </div>
          </form>
        </section>

        <aside className="meli-card p-6 flex flex-col gap-4 h-fit">
          <h2 className="text-lg font-semibold text-[var(--meli-dark)]">Resultado</h2>
          {!result && !error && (
            <p className="text-sm text-[var(--meli-muted)]">
              Completa los datos y presiona "Calcular" para obtener la predicción.
            </p>
          )}
          {error && (
            <div className="border border-red-300 bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          {result && (
            <div className="space-y-4">
              <div className="border border-[var(--meli-border)] rounded-md p-4 bg-[#fafafa]">
                <p className="text-sm uppercase tracking-wide text-[var(--meli-muted)]">
                  Condición estimada
                </p>
                <p className="text-2xl font-bold text-[var(--meli-dark)] mt-2">
                  {result.prediction === "new" ? "Nuevo" : "Usado"}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Probabilidad "Nuevo"</span>
                  <span className="font-semibold">
                    {(result.probability_new * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Probabilidad "Usado"</span>
                  <span className="font-semibold">
                    {(result.probability_used * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Score texto (LogReg)</span>
                  <span className="font-semibold">
                    {(result.text_score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
        </div>
          )}
        </aside>
      </main>

      <footer className="bg-white border-t border-[var(--meli-border)]">
        <div className="meli-container py-6 flex flex-col gap-2 text-sm text-[var(--meli-muted)]">
          <p>
            Resultado basado en el ensemble TF-IDF + Regresión Logística + LightGBM entrenado sobre MLA_100k.
          </p>
          <p>
            Implementación de referencia sin afiliación oficial a Mercado Libre. Datos de ejemplo inspirados en listados reales como el Samsung Galaxy A55 5G. [<a href="https://www.mercadolibre.com.ar/samsung-galaxy-galaxy-a55-5g-dual-sim-256-gb-azul-claro-8-gb-ram/p/MLA34731719#polycard_client=search-nordic&search_layout=stack&position=1&type=product&tracking_id=bec60ac3-9b1b-4de4-8f0c-4607ebe49f1c&wid=MLA1994031228&sid=search" target="_blank" rel="noopener noreferrer" className="underline">Referencia de estilo</a>]
          </p>
        </div>
      </footer>
    </div>
  );
}
