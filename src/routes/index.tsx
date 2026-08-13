import { createFileRoute } from "@tanstack/react-router";
import { FilmExperience } from "@/components/cinematic/film-experience";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <FilmExperience />;
}
