export async function fetchPuzzle(date) {
  const url = date ? `/api/puzzle/${encodeURIComponent(date)}` : '/api/puzzle/today';
  return readJson(await fetch(url, { headers: { Accept: 'application/json' } }));
}


// judging a sequence of actions against a puzzle
export async function replay(date, actions) {
  const res = await fetch(`/api/puzzle/${encodeURIComponent(date)}/replay`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ actions }),
  });
  return readJson(res);
}

export async function fetchModel() {
  const res = await fetch('/models/all_objects.obj');
  if (!res.ok) throw new Error(`Could not load the 3D model (HTTP ${res.status}).`);
  return res.text();
}

async function readJson(res) {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body && body.error) detail = body.error;
    } catch {
    }
    throw new Error(detail);
  }

  return res.json();
}