"use client";

import { useEffect, useState } from "react";
import { useUser, useSession } from "@clerk/nextjs";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store";
import { deletePoem } from "@/lib/store/gameSlice";
import MultiStepGameCreator from "@/components/admin/MultiStepGameCreator";
import { Poem } from "@/lib/store/gameSlice";
import toast from "react-hot-toast";
import { Roles } from "types/globals";
import { PencilIcon, Trash2Icon, PlayIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const checkRole = async (role: Roles) => {
    return user?.publicMetadata.role === role;
  };
  useEffect(() => {
    (async () => {
      const result = await checkRole("admin");
      if (!result) {
        router.back();
      }
    })();
  }, []);
  const { session } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const poems = useSelector((state: RootState) => state.game.poems);
  const [currentView, setCurrentView] = useState<"dashboard" | "create-game">(
    "dashboard",
  );
  const [editingPoem, setEditingPoem] = useState<Poem | null>(null);

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-orange-100 via-orange-50 to-orange-100">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-100 via-orange-50 to-orange-100">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-800">
            Accès Restreint
          </h1>
          <p className="mb-6 text-gray-600">
            Vous devez être connecté pour accéder à l'interface
            d'administration.
          </p>
          <a
            href="/sign-in"
            className="rounded-full bg-orange-500 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-600"
          >
            Se Connecter
          </a>
        </div>
      </div>
    );
  }

  const handleTestGame = (poem: Poem) => {
    // Sauvegarder le poème de test dans localStorage pour qu'il soit accessible dans le nouvel onglet
    localStorage.setItem("alphi-test-poem", JSON.stringify(poem));
    // Ouvrir le jeu avec un simple flag de test
    const gameUrl = `/jeu?test=true`;
    window.open(gameUrl, "_blank");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setEditingPoem(null);
  };

  const handleDeleteGame = async (poem: Poem) => {
    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer le jeu "${poem.verse.substring(
          0,
          50,
        )}..." ?`,
      )
    ) {
      try {
        if (!session) {
          toast.error("Session non disponible");
          return;
        }

        const sessionToken = await session.getToken({ template: "supabase" });
        if (!sessionToken) {
          toast.error("Token de session non disponible");
          return;
        }

        await dispatch(deletePoem({ sessionToken, poemId: poem.id }));
        toast.success("Jeu supprimé avec succès!");
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        toast.error("Erreur lors de la suppression du jeu");
      }
    }
  };

  if (currentView === "create-game") {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-orange-100 via-orange-50 to-orange-100 p-6">
        <div className="mx-auto max-w-6xl">
          <MultiStepGameCreator
            editingPoem={editingPoem}
            onCancel={handleBackToDashboard}
            onTestGame={handleTestGame}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-orange-100 via-orange-50 to-orange-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-3xl font-bold text-gray-800">
            Interface d'Administration - Alphi
          </h1>
          <p className="mb-8 text-gray-600">
            Gérez le contenu éducatif et suivez les progrès des élèves
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Gestion du Contenu */}
            <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 p-6 text-white">
              <div className="mb-4 flex items-center">
                <svg
                  className="mr-3 h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-semibold">Contenu Éducatif</h3>
              </div>
              <p className="mb-4 text-orange-100">
                Gérez les poèmes, images et exercices de grammaire
              </p>
              <button
                onClick={() => setCurrentView("create-game")}
                className="rounded-lg bg-white px-4 py-2 font-medium text-orange-500 transition-colors hover:bg-orange-50"
              >
                Gérer le Contenu
              </button>
            </div>

            {/* Suivi des Progrès */}
            <div className="rounded-2xl bg-gradient-to-br from-teal-400 to-teal-500 p-6 text-white">
              <div className="mb-4 flex items-center">
                <svg
                  className="mr-3 h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-xl font-semibold">Suivi des Progrès</h3>
              </div>
              <p className="mb-4 text-teal-100">
                Analysez les performances et progrès des élèves
              </p>
              <button className="rounded-lg bg-white px-4 py-2 font-medium text-teal-500 transition-colors hover:bg-teal-50">
                Voir les Statistiques
              </button>
            </div>

            {/* Gestion des Utilisateurs */}
            <div className="from-coral-400 to-coral-500 rounded-2xl bg-gradient-to-br p-6 text-white">
              <div className="mb-4 flex items-center">
                <svg
                  className="mr-3 h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <h3 className="text-xl font-semibold">Utilisateurs</h3>
              </div>
              <p className="mb-4 text-red-100">
                Gérez les comptes élèves et enseignants
              </p>
              <button className="rounded-lg bg-white px-4 py-2 font-medium text-red-500 transition-colors hover:bg-red-50">
                Gérer les Utilisateurs
              </button>
            </div>
          </div>

          {/* Section Statistiques Rapides */}
          <div className="mt-6 rounded-2xl bg-gray-50 p-6">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">
              Statistiques Rapides
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">156</div>
                <div className="text-sm text-gray-600">Élèves Actifs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-500">
                  {poems.length}
                </div>
                <div className="text-sm text-gray-600">Jeux Créés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">1,248</div>
                <div className="text-sm text-gray-600">Parties Jouées</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">85%</div>
                <div className="text-sm text-gray-600">Taux de Réussite</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Liste des Jeux Créés */}
        {poems.length > 0 && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h3 className="mb-4 text-xl font-semibold text-gray-800">
              Jeux Créés ({poems.length})
            </h3>
            <div className="space-y-4">
              {poems.map((poem) => (
                <div
                  key={poem.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex-1">
                    <p className="mb-1 font-medium text-gray-800">
                      {poem.verse}
                    </p>
                    <p className="text-sm text-gray-600">
                      Mot mystère: {poem.targetWord} ({poem.targetWordGender}) •
                      {poem.words.length} mots • Créé le{" "}
                      {new Date(poem.createdAt).toLocaleDateString("fr-CA")}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleTestGame(poem)}
                      className="flex gap-1 rounded bg-blue-500 px-1 py-1  text-sm text-white transition-colors hover:bg-blue-600 sm:px-3"
                    >
                      <PlayIcon className="h-4 w-4" />
                      <span className="hidden sm:block">Tester</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingPoem(poem);
                        setCurrentView("create-game");
                      }}
                      className="flex gap-1 rounded bg-gray-500 px-1 py-1  text-sm text-white transition-colors hover:bg-gray-600 sm:px-3 "
                    >
                      <PencilIcon className="h-4 w-4" />
                      <span className="hidden sm:block">Modifier</span>
                    </button>
                    <button
                      onClick={() => handleDeleteGame(poem)}
                      className="flex gap-1 rounded bg-red-500 px-1 py-1 text-sm text-white transition-colors hover:bg-red-600 sm:px-3"
                    >
                      <Trash2Icon className="h-4 w-4" />
                      <span className="hidden sm:block">Supprimer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => setCurrentView("create-game")}
                className="rounded-lg bg-orange-500 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-600"
              >
                ➕ Créer un Nouveau Jeu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
