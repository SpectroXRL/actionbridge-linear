import { useEffect, useRef, useState, type FormEvent } from "react";
import { API_BASE_URL } from "../../config";

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

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const form = e.currentTarget;
  const formData = new FormData(form);

  await fetch(`${API_BASE_URL}/linear/transcript`, {
    method: "POST",
    body: formData,
  });
};

const LinearIndex = () => {
  const [teams, setTeams] = useState<Node[]>([]);
  const [projects, setProjects] = useState<Node[]>([]);
  const teamSelect = useRef<HTMLSelectElement | null>(null);

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
        <button type="submit">Submit</button>
      </form>
    </>
  );
};

export default LinearIndex;
