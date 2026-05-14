"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useSyncExternalStore } from "react";
import { SubmitHandler, useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod/v4";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  Leaf,
  Droplets,
  Plus,
  Trash2,
  Edit2,
  Download,
  Search,
  BarChart3,
} from "lucide-react";

type OliveQuote = {
  id: number;
  designation: string;
  oliveType: string;
  hauteur: number;
  quantite: number;
  prixUnitaire: number;
  total: number;
};

const OLIVE_TYPES = {
  Marocaines: ["Picholine marocaine", "Menara", "Haouzia", "Dahbia"],
  Internationales: [
    "Arbequina",
    "Picual",
    "Koroneiki",
    "Frantoio",
    "Manzanilla",
    "Kalamata",
    "Hojiblanca",
    "Cornicabra",
    "Leccino",
    "Coratina",
    "Taggiasca",
    "Gemlik",
    "Ayvalik",
    "Chemlali",
    "Chetoui",
    "Galega",
    "Cobrançosa",
    "Souri",
    "Nabali",
    "Baladi",
  ],
};

const quoteSchema = z.object({
  designation: z.string().min(1, "Désignation requise").max(500),
  oliveType: z.string().min(1, "Type d'olive requis"),
  hauteur: z.number().min(1, "Hauteur minimum 1 cm"),
  quantite: z.number().min(1, "Quantité minimum 1"),
  prixUnitaire: z.number().min(0, "Prix unitaire requis"),
});
type QuoteForm = z.infer<typeof quoteSchema>;

const exportSchema = z.object({
  clientName: z.string().min(1, "Nom du client requis"),
  paymentType: z.enum(["ht", "ttc"]),
});
type ExportForm = z.infer<typeof exportSchema>;

const COMPANY_NAME = "Pepiniere Abouelaaz";
const PHONE_NUMBER = "0664724261";
const STORAGE_KEY = "olive_quotes_v1";

const EMPTY_QUOTES: OliveQuote[] = [];

const quoteStore = (() => {
  let cachedQuotes: OliveQuote[] = EMPTY_QUOTES;
  let cachedRaw = "";
  const listeners = new Set<() => void>();

  const readStorage = () => {
    if (typeof window === "undefined") {
      return cachedQuotes;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      cachedQuotes = EMPTY_QUOTES;
      cachedRaw = "";
      return cachedQuotes;
    }

    if (stored === cachedRaw) {
      return cachedQuotes;
    }

    try {
      cachedQuotes = JSON.parse(stored) as OliveQuote[];
      cachedRaw = stored;
    } catch {
      cachedQuotes = EMPTY_QUOTES;
      cachedRaw = "";
    }

    return cachedQuotes;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const set = (nextQuotes: OliveQuote[]) => {
    cachedQuotes = nextQuotes;
    cachedRaw = JSON.stringify(nextQuotes);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, cachedRaw);
    }
    notify();
  };

  return {
    getSnapshot: readStorage,
    getServerSnapshot: () => EMPTY_QUOTES,
    subscribe,
    set,
  };
})();

function sanitizePdfText(text: string) {
  return text
    .replace(/[\u202F\u00A0]/g, " ")
    .replace(/[^\x00-\x7F]/g, "")
    .trim();
}

function calculateQuoteTotal(prixUnitaire: number, quantite: number): number {
  return prixUnitaire * quantite;
}

const Home = () => {
  const quotes = useSyncExternalStore(
    quoteStore.subscribe,
    quoteStore.getSnapshot,
    quoteStore.getServerSnapshot,
  );
  const [editId, setEditId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchOlive, setSearchOlive] = useState("");

  const persistQuotes = (nextQuotes: OliveQuote[]) => {
    quoteStore.set(nextQuotes);
  };

  const {
    handleSubmit,
    register,
    reset,
    setValue,
    control,
    formState: { isSubmitting, errors },
  } = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      hauteur: 0,
      quantite: 0,
      oliveType: "",
      prixUnitaire: 0,
    },
  });

  const {
    handleSubmit: handleExport,
    register: registerExport,
    formState: { isSubmitting: isExporting, errors: exportErrors },
  } = useForm<ExportForm>({
    resolver: zodResolver(exportSchema),
  });

  const prixUnitaire = useWatch({ control, name: "prixUnitaire" }) ?? 0;
  const quantite = useWatch({ control, name: "quantite" }) ?? 0;

  const onSubmit: SubmitHandler<QuoteForm> = async (data) => {
    const total = calculateQuoteTotal(data.prixUnitaire, data.quantite);

    if (editId !== null) {
      persistQuotes(
        quotes.map((item) =>
          item.id === editId
            ? {
                ...item,
                designation: data.designation,
                oliveType: data.oliveType,
                hauteur: data.hauteur,
                quantite: data.quantite,
                prixUnitaire: data.prixUnitaire,
                total,
              }
            : item,
        ),
      );
      setEditId(null);
      toast.success("Article modifié avec succès");
    } else {
      const nextId =
        quotes.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
      const newQuote: OliveQuote = {
        id: nextId,
        designation: data.designation,
        oliveType: data.oliveType,
        hauteur: data.hauteur,
        quantite: data.quantite,
        prixUnitaire: data.prixUnitaire,
        total,
      };
      persistQuotes([...quotes, newQuote]);
      toast.success("Article ajouté");
    }
    reset();
    setShowDropdown(false);
    setSearchOlive("");
  };

  const handleDelete = (id: number) => {
    persistQuotes(quotes.filter((item) => item.id !== id));
    if (editId === id) {
      reset();
      setEditId(null);
    }
    toast.success("Article supprimé");
  };

  const handleEdit = (id: number) => {
    const item = quotes.find((el) => el.id === id);
    if (item) {
      setValue("designation", item.designation);
      setValue("oliveType", item.oliveType);
      setValue("hauteur", item.hauteur);
      setValue("quantite", item.quantite);
      setValue("prixUnitaire", item.prixUnitaire);
      setEditId(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCancel = () => {
    reset();
    setEditId(null);
    setSearchOlive("");
  };

  const calculateTotal = () => {
    return quotes.reduce((sum, item) => sum + item.total, 0);
  };

  const filteredOlives = Object.entries(OLIVE_TYPES).reduce(
    (acc, [group, types]) => {
      const filtered = types.filter((t) =>
        t.toLowerCase().includes(searchOlive.toLowerCase()),
      );
      if (filtered.length > 0) {
        acc[group] = filtered;
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const generatePdf = async (data: ExportForm) => {
    try {
      if (quotes.length === 0) {
        toast.error("Aucun article à exporter");
        return;
      }

      const pdfDoc = await PDFDocument.create();
      const pageWidth = 595;
      const pageHeight = 842;
      let page = pdfDoc.addPage([pageWidth, pageHeight]);

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const marginX = 35;
      const marginRight = 35;
      const availableWidth = pageWidth - marginX - marginRight;

      const columns = [
        { title: "Désignation", width: availableWidth * 0.35 },
        { title: "Type d'olive", width: availableWidth * 0.2 },
        { title: "Hauteur", width: availableWidth * 0.15 },
        { title: "Quantité", width: availableWidth * 0.15 },
        { title: "PU (DH)", width: availableWidth * 0.1 },
        { title: "Total (DH)", width: availableWidth * 0.05 },
      ];

      const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);
      let cursorY = pageHeight - 60;

      const darkGreen = rgb(26 / 255, 35 / 255, 16 / 255);
      const midGreen = rgb(47 / 255, 64 / 255, 32 / 255);
      const lightGreen = rgb(111 / 255, 168 / 255, 50 / 255);
      const gold = rgb(201 / 255, 168 / 255, 76 / 255);
      const cream = rgb(240 / 255, 234 / 255, 214 / 255);

      function drawHeader() {
        page.drawRectangle({
          x: marginX,
          y: pageHeight - 50,
          width: availableWidth,
          height: 40,
          color: darkGreen,
        });

        page.drawText(COMPANY_NAME, {
          x: marginX + 10,
          y: pageHeight - 25,
          size: 18,
          font: boldFont,
          color: cream,
        });

        page.drawText(`Téléphone : ${PHONE_NUMBER}`, {
          x: marginX + 10,
          y: pageHeight - 40,
          size: 9,
          font,
          color: lightGreen,
        });

        page.drawText(`Date : ${new Date().toLocaleDateString("fr-FR")}`, {
          x: pageWidth - marginRight - 120,
          y: pageHeight - 25,
          size: 9,
          font,
          color: cream,
        });

        page.drawText(`Client : ${sanitizePdfText(data.clientName)}`, {
          x: pageWidth - marginRight - 120,
          y: pageHeight - 40,
          size: 9,
          font,
          color: cream,
        });

        cursorY = pageHeight - 60;
      }

      function drawTableHeader() {
        page.drawRectangle({
          x: marginX,
          y: cursorY - 20,
          width: tableWidth,
          height: 20,
          color: lightGreen,
        });

        let x = marginX;
        for (const col of columns) {
          page.drawText(col.title, {
            x: x + 4,
            y: cursorY - 16,
            size: 8,
            font: boldFont,
            color: cream,
          });
          x += col.width;
        }

        cursorY -= 20;
      }

      function drawRow(quote: OliveQuote) {
        const cellHeight = 18;

        if (cursorY - cellHeight < 50) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          cursorY = pageHeight - 40;
          drawHeader();
          drawTableHeader();
        }

        page.drawRectangle({
          x: marginX,
          y: cursorY - cellHeight,
          width: tableWidth,
          height: cellHeight,
          color: cursorY % 2 === 0 ? rgb(1, 1, 1) : rgb(0.98, 0.98, 0.98),
          borderColor: lightGreen,
          borderWidth: 0.5,
        });

        const rowData = [
          quote.designation,
          quote.oliveType,
          `${quote.hauteur} cm`,
          `${quote.quantite}`,
          `${quote.prixUnitaire.toFixed(2)}`,
          `${quote.total.toFixed(2)}`,
        ];

        let x = marginX;
        for (let i = 0; i < columns.length; i++) {
          page.drawText(rowData[i], {
            x: x + 4,
            y: cursorY - 13,
            size: 8,
            font,
            color: i >= 4 ? gold : rgb(0, 0, 0),
          });
          x += columns[i].width;
        }

        cursorY -= cellHeight;
      }

      drawHeader();
      drawTableHeader();

      let total = 0;
      for (const quote of quotes) {
        drawRow(quote);
        total += quote.total;
      }

      if (data.paymentType === "ttc") {
        total *= 1.2;
      }

      if (cursorY - 40 < 50) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        cursorY = pageHeight - 40;
      }

      page.drawRectangle({
        x: marginX + tableWidth - 150,
        y: cursorY - 35,
        width: 150,
        height: 35,
        color: midGreen,
        borderColor: gold,
        borderWidth: 2,
      });

      page.drawText(`Total ${data.paymentType === "ttc" ? "TTC" : "HT"}:`, {
        x: marginX + tableWidth - 145,
        y: cursorY - 15,
        size: 11,
        font: boldFont,
        color: cream,
      });

      page.drawText(`${total.toFixed(2)} DH`, {
        x: marginX + tableWidth - 145,
        y: cursorY - 28,
        size: 12,
        font: boldFont,
        color: gold,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `devis_olive_${sanitizePdfText(data.clientName)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF téléchargé avec succès");
    } catch (err) {
      toast.error("Erreur lors de la génération du PDF");
      console.error(err);
    }
  };

  const pricePreview =
    prixUnitaire > 0 && quantite > 0
      ? calculateQuoteTotal(prixUnitaire, quantite)
      : 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-emerald-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-emerald-900/30 bg-linear-to-r from-emerald-950/50 to-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex items-center gap-4 mb-2">
            <div className="relative">
              <Leaf className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 drop-shadow-lg" />
              <Droplets className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-emerald-200 to-amber-200">
              Pepiniere Abouelaaz
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Stats */}
        {quotes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-300/70 text-sm">Articles</p>
                  <p className="text-2xl font-bold text-emerald-100 mt-1">
                    {quotes.length}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-emerald-400/50" />
              </div>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-300/70 text-sm">Quantité totale</p>
                  <p className="text-2xl font-bold text-emerald-100 mt-1">
                    {quotes.reduce((sum, q) => sum + q.quantite, 0)}
                  </p>
                </div>
                <Droplets className="w-8 h-8 text-amber-400/50" />
              </div>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-300/70 text-sm">Total</p>
                  <p className="text-2xl font-bold text-amber-300 mt-1">
                    {calculateTotal().toFixed(2)} DH
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-amber-500/50" />
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mb-12">
          <div className="bg-linear-to-br from-emerald-950/60 to-slate-900/60 border border-emerald-800/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Plus className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-emerald-100">
                {editId ? "Modifier l'article" : "Nouvel article"}
              </h2>
            </div>

            <div className="space-y-6">
              {/* Designation */}
              <div>
                <label className="block text-sm font-medium text-emerald-200 mb-2">
                  Désignation
                </label>
                <textarea
                  {...register("designation")}
                  placeholder="ex: Huile d'olive extra vierge..."
                  className="w-full px-4 py-3 bg-slate-900/50 border border-emerald-800/30 rounded-lg text-emerald-50 placeholder-emerald-500/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition resize-none"
                  rows={3}
                />
                {errors.designation && (
                  <p className="text-red-400/80 text-sm mt-1">
                    {errors.designation.message}
                  </p>
                )}
              </div>

              {/* Olive Type with Searchable Dropdown */}
              <div>
                <label className="block text-sm font-medium text-emerald-200 mb-2">
                  Type d&apos;olive
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500/50" />
                    <input
                      type="text"
                      value={searchOlive}
                      onChange={(e) => setSearchOlive(e.target.value)}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Rechercher ou sélectionner..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-emerald-800/30 rounded-lg text-emerald-50 placeholder-emerald-500/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                    />
                  </div>

                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-emerald-800/30 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto">
                      {Object.entries(filteredOlives).length > 0 ? (
                        Object.entries(filteredOlives).map(([group, types]) => (
                          <div key={group}>
                            <div className="px-4 py-2 text-xs font-semibold text-emerald-400/60 uppercase tracking-wider border-b border-emerald-800/20">
                              {group}
                            </div>
                            {types.map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => {
                                  setValue("oliveType", type);
                                  setSearchOlive(type);
                                  setShowDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 text-emerald-50 hover:bg-emerald-900/30 transition"
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-emerald-400/50 text-sm">
                          Aucun résultat
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {errors.oliveType && (
                  <p className="text-red-400/80 text-sm mt-1">
                    {errors.oliveType.message}
                  </p>
                )}
              </div>

              {/* Hauteur, Quantité */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-emerald-200 mb-2">
                    Hauteur (cm)
                  </label>
                  <input
                    type="number"
                    {...register("hauteur", { valueAsNumber: true })}
                    placeholder="ex: 50"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-emerald-800/30 rounded-lg text-emerald-50 placeholder-emerald-500/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                  />
                  {errors.hauteur && (
                    <p className="text-red-400/80 text-sm mt-1">
                      {errors.hauteur.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-200 mb-2">
                    Quantité
                  </label>
                  <input
                    type="number"
                    {...register("quantite", { valueAsNumber: true })}
                    placeholder="ex: 10"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-emerald-800/30 rounded-lg text-emerald-50 placeholder-emerald-500/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                  />
                  {errors.quantite && (
                    <p className="text-red-400/80 text-sm mt-1">
                      {errors.quantite.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-200 mb-2">
                    Prix unitaire (DH)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("prixUnitaire", { valueAsNumber: true })}
                    placeholder="ex: 120"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-emerald-800/30 rounded-lg text-emerald-50 placeholder-emerald-500/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                  />
                  {errors.prixUnitaire && (
                    <p className="text-red-400/80 text-sm mt-1">
                      {errors.prixUnitaire.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-200 mb-2">
                    Total estimé (DH)
                  </label>
                  <div className="px-4 py-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg text-amber-300 font-semibold">
                    {pricePreview.toFixed(2)} DH
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  {isSubmitting ? "..." : editId ? "Enregistrer" : "Ajouter"}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 bg-slate-700 hover:bg-slate-600 text-emerald-100 font-medium py-3 rounded-lg transition"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Table */}
        {quotes.length === 0 ? (
          <div className="bg-linear-to-br from-emerald-950/40 to-slate-900/40 border border-emerald-800/20 rounded-2xl p-12 text-center backdrop-blur-sm">
            <Leaf className="w-12 h-12 text-emerald-400/30 mx-auto mb-4" />
            <p className="text-emerald-300/60 text-lg">
              Aucun article pour le moment
            </p>
            <p className="text-emerald-400/40 text-sm mt-2">
              Ajoutez votre premier article ci-dessus
            </p>
          </div>
        ) : (
          <div className="bg-linear-to-br from-emerald-950/40 to-slate-900/40 border border-emerald-800/20 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-linear-to-r from-emerald-900/50 to-slate-900/50 border-b border-emerald-800/30">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-200">
                      Désignation
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-200">
                      Type d&apos;olive
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-200">
                      Hauteur
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-200">
                      Quantité
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-200">
                      PU (DH)
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-amber-300">
                      Total (DH)
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-800/20">
                  {quotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="hover:bg-emerald-900/20 transition"
                    >
                      <td className="px-6 py-4 text-emerald-50 text-sm max-w-xs truncate">
                        {quote.designation}
                      </td>
                      <td className="px-6 py-4 text-emerald-200 text-sm">
                        <span className="inline-block bg-emerald-900/40 text-emerald-100 px-3 py-1 rounded-full text-xs font-medium border border-emerald-800/30">
                          {quote.oliveType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-emerald-200 text-sm">
                        {quote.hauteur} cm
                      </td>
                      <td className="px-6 py-4 text-emerald-200 text-sm">
                        {quote.quantite}
                      </td>
                      <td className="px-6 py-4 text-emerald-200 text-sm">
                        {quote.prixUnitaire.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-amber-300 text-sm font-semibold">
                        {quote.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(quote.id)}
                            className="inline-flex items-center gap-1 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-200 px-3 py-1 rounded-lg transition text-xs font-medium border border-emerald-800/30"
                          >
                            <Edit2 className="w-3 h-3" />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(quote.id)}
                            className="inline-flex items-center gap-1 bg-red-900/40 hover:bg-red-900/60 text-red-200 px-3 py-1 rounded-lg transition text-xs font-medium border border-red-800/30"
                          >
                            <Trash2 className="w-3 h-3" />
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="border-t border-emerald-800/20 bg-linear-to-r from-emerald-900/30 to-slate-900/30 px-6 py-6 flex justify-end">
              <div className="bg-linear-to-r from-emerald-900/60 to-emerald-800/40 border border-emerald-600/40 rounded-xl p-6 backdrop-blur-sm">
                <p className="text-emerald-300/70 text-sm mb-2">
                  Total du devis
                </p>
                <p className="text-3xl font-bold text-amber-300">
                  {calculateTotal().toFixed(2)}{" "}
                  <span className="text-lg">DH</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Export Section */}
        {quotes.length > 0 && (
          <form
            onSubmit={handleExport(generatePdf)}
            className="mt-12 bg-linear-to-br from-emerald-950/60 to-slate-900/60 border border-emerald-800/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <Download className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-emerald-100">
                Exporter le devis
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-emerald-200 mb-2">
                  Nom du client
                </label>
                <input
                  type="text"
                  {...registerExport("clientName")}
                  placeholder="ex: Coopérative Al Baraka"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-emerald-800/30 rounded-lg text-emerald-50 placeholder-emerald-500/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
                {exportErrors.clientName && (
                  <p className="text-red-400/80 text-sm mt-1">
                    {exportErrors.clientName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-200 mb-2">
                  Type de paiement
                </label>
                <select
                  {...registerExport("paymentType")}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-emerald-800/30 rounded-lg text-emerald-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                >
                  <option value="">Sélectionner...</option>
                  <option value="ht">Montant HT</option>
                  <option value="ttc">Montant TTC</option>
                </select>
                {exportErrors.paymentType && (
                  <p className="text-red-400/80 text-sm mt-1">
                    {exportErrors.paymentType.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isExporting}
              className="mt-6 w-full sm:w-auto bg-linear-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition duration-200 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2 mx-auto"
            >
              <Download className="w-5 h-5" />
              {isExporting ? "Génération..." : "Télécharger le PDF"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Home;
