import { useEffect, useRef, useState, type FormEvent } from "react";
import { API_BASE_URL } from "../../config";
import { useLinearReview } from "./useLinearReview";
import "./LinearIndex.css";

type Team = {
  nodes: Node[];
};

type Project = {
  nodes: Node[];
};

type Node = {
  id: string;
  name: string;
};

const LinearIndex = () => {
  const {
    stage,
    error,
    extract,
    extractedIssues,
    meta,
    rejectedIndices,
    toggleIssue,
    submit,
    cancel,
    reset,
  } = useLinearReview();
  const [teams, setTeams] = useState<Node[]>([]);
  const [projects, setProjects] = useState<Node[]>([]);
  const teamSelect = useRef<HTMLSelectElement | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await extract(formData);
  };

  const getProjects = async () => {
    const teamId = teamSelect.current?.value;
    if (teamId !== "") {
      const res = await fetch(
        `${API_BASE_URL}/linear/projects?teamId=${teamId}`,
      );
      const data: Project = await res.json();
      setProjects(data.nodes);
    } else {
      setProjects([]);
    }
  };

  useEffect(() => {
    async function getTeams() {
      const res = await fetch(`${API_BASE_URL}/linear/teams`);
      const data: Team = await res.json();
      setTeams(data.nodes);
    }
    getTeams();
  }, []);

  if (stage === "review" || stage === "submitting") {
    const busy = stage === "submitting";
    const stateMap = Object.fromEntries(
      (meta?.states ?? []).map((s) => [s.id, s.name]),
    );
    const labelMap = Object.fromEntries(
      (meta?.labels ?? []).map((l) => [l.id, l.name]),
    );
    const noneChecked = extractedIssues.every((_, i) => rejectedIndices.has(i));

    return (
      <div className="issue-review">
        <div className="issue-list">
          {extractedIssues.map((issue, i) => (
            <div
              key={i}
              className={`issue-card${rejectedIndices.has(i) ? " issue-card--rejected" : ""}`}
            >
              <label className="issue-card__header">
                <input
                  type="checkbox"
                  className="issue-checkbox"
                  checked={!rejectedIndices.has(i)}
                  disabled={busy}
                  onChange={() => toggleIssue(i)}
                />
                <span className="issue-checkbox__ui" aria-hidden="true" />
                <span className="issue-card__title">{issue.title}</span>
              </label>
              {issue.description && (
                <p className="issue-card__description">{issue.description}</p>
              )}
              {(issue.stateId || issue.labelIds?.length) && (
                <div className="issue-card__meta">
                  {issue.stateId && (
                    <span className="issue-state">
                      {stateMap[issue.stateId]}
                    </span>
                  )}
                  {issue.labelIds?.map((id) => (
                    <span key={id} className="issue-label">
                      {labelMap[id]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {noneChecked && (
          <p className="issue-review__notice">No issues selected</p>
        )}
        {error && <p className="issue-review__error">{error}</p>}
        <div className="issue-review__actions">
          <button onClick={cancel} disabled={busy}>
            Cancel
          </button>
          <button onClick={submit} disabled={busy || noneChecked}>
            Approve
          </button>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <>
        <p>{extractedIssues.length} issues created</p>
        <button onClick={reset}>Start over</button>
      </>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <select name="teamId" ref={teamSelect} onChange={getProjects}>
          <option value="">Select a team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <select name="projectId">
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <input
          type="file"
          id="txtfile"
          name="transcript"
          accept=".txt,.doc,.docx,.xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />
        <button type="submit" disabled={stage === "extracting"}>
          {stage === "extracting" ? "Analysing…" : "Submit"}
        </button>{" "}
        {error && <p>{error}</p>}{" "}
      </form>
    </>
  );
};

export default LinearIndex;
