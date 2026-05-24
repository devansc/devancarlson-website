import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./routes/home/Home";
import { GiggLayout } from "./routes/gigg/GiggLayout";
import { SongList } from "./routes/gigg/SongList";
import { SongEditor } from "./routes/gigg/SongEditor";
import { SongView } from "./routes/gigg/SongView";
import { Setlists } from "./routes/gigg/Setlists";
import { SetlistDetail } from "./routes/gigg/SetlistDetail";
import { SetlistPlay } from "./routes/gigg/SetlistPlay";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route
          path="gigg"
          element={
            <ProtectedRoute>
              <GiggLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SongList />} />
          <Route path="songs/new" element={<SongEditor />} />
          <Route path="songs/:id" element={<SongView />} />
          <Route path="songs/:id/edit" element={<SongEditor />} />
          <Route path="setlists" element={<Setlists />} />
          <Route path="setlists/:id" element={<SetlistDetail />} />
          <Route path="setlists/:id/play" element={<SetlistPlay />} />
        </Route>
        <Route path="*" element={<div className="p-8 text-neutral-400">Not found.</div>} />
      </Route>
    </Routes>
  );
}
