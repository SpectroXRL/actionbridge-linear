import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLinearReview } from "./useLinearReview";
import LinearIndex from "./LinearIndex";

vi.mock("./useLinearReview");

const makeHook = (overrides: Record<string, unknown> = {}) => ({
  stage: "form" as const,
  extractedIssues: [],
  meta: null,
  rejectedIndices: new Set<number>(),
  error: null,
  extract: vi.fn(),
  toggleIssue: vi.fn(),
  submit: vi.fn(),
  cancel: vi.fn(),
  reset: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  vi.mocked(useLinearReview).mockReturnValue(makeHook());
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nodes: [] }),
    }),
  );
});

describe("LinearIndex", () => {
  it("form stage renders team select, project select, and file input", () => {
    const { container } = render(<LinearIndex />);

    expect(vi.mocked(useLinearReview)).toHaveBeenCalled();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(container.querySelector('input[type="file"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: /submit/i })).toBeDefined();
  });
  it('submit button is labelled "Analysing…" and disabled during extracting stage', () => {
    vi.mocked(useLinearReview).mockReturnValue(
      makeHook({ stage: "extracting" }),
    );

    render(<LinearIndex />);

    const btn = screen.getByRole("button", { name: /analysing/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows inline error message when error is set on the form stage", () => {
    vi.mocked(useLinearReview).mockReturnValue(
      makeHook({ error: "Something went wrong" }),
    );

    render(<LinearIndex />);

    expect(screen.getByText("Something went wrong")).toBeDefined();
  });
  it("review stage renders one row per issue with checkbox, title, description, state name, and label names", () => {
    const issues = [
      {
        title: "Fix login bug",
        description: "Users cannot log in",
        teamId: "t1",
        stateId: "s1",
        labelIds: ["l1"],
      },
    ];
    const meta = {
      teamId: "t1",
      states: [{ id: "s1", name: "In Progress" }],
      labels: [{ id: "l1", name: "Bug" }],
    };

    vi.mocked(useLinearReview).mockReturnValue(
      makeHook({ stage: "review", extractedIssues: issues, meta }),
    );

    render(<LinearIndex />);

    expect(screen.getByRole("checkbox")).toBeDefined();
    expect(screen.getByText("Fix login bug")).toBeDefined();
    expect(screen.getByText("Users cannot log in")).toBeDefined();
    expect(screen.getByText("In Progress")).toBeDefined();
    expect(screen.getByText("Bug")).toBeDefined();
  });
  it("all checkboxes are checked by default when entering review stage", () => {
    const issues = [
      { title: "Issue A", teamId: "t1" },
      { title: "Issue B", teamId: "t1" },
    ];
    vi.mocked(useLinearReview).mockReturnValue(
      makeHook({
        stage: "review",
        extractedIssues: issues,
        rejectedIndices: new Set(),
      }),
    );

    render(<LinearIndex />);

    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes.every((cb) => cb.checked)).toBe(true);
  });

  it("unchecking a checkbox calls toggleIssue with that index", () => {
    const toggleIssue = vi.fn();
    const issues = [
      { title: "Issue A", teamId: "t1" },
      { title: "Issue B", teamId: "t1" },
    ];
    vi.mocked(useLinearReview).mockReturnValue(
      makeHook({ stage: "review", extractedIssues: issues, toggleIssue }),
    );

    render(<LinearIndex />);

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    expect(toggleIssue).toHaveBeenCalledWith(1);
  });

  it('"Approve" is disabled and shows a message when zero issues are checked', () => {
    const issues = [{ title: "Issue A", teamId: "t1" }];
    // index 0 is rejected → zero checked
    vi.mocked(useLinearReview).mockReturnValue(
      makeHook({
        stage: "review",
        extractedIssues: issues,
        rejectedIndices: new Set([0]),
      }),
    );

    render(<LinearIndex />);

    const approveBtn = screen.getByRole("button", {
      name: /approve/i,
    }) as HTMLButtonElement;
    expect(approveBtn.disabled).toBe(true);
    expect(screen.getByText(/no issues selected/i)).toBeDefined();
  });

  it('"Approve" calls submit() when at least one issue is checked', () => {
    const submit = vi.fn();
    const issues = [{ title: "Issue A", teamId: "t1" }];
    vi.mocked(useLinearReview).mockReturnValue(
      makeHook({ stage: "review", extractedIssues: issues, submit }),
    );

    render(<LinearIndex />);

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    expect(submit).toHaveBeenCalled();
  });

  it('"Cancel" calls cancel()', () => {
    const cancel = vi.fn();
    const issues = [{ title: "Issue A", teamId: "t1" }];
    vi.mocked(useLinearReview).mockReturnValue(
      makeHook({ stage: "review", extractedIssues: issues, cancel }),
    );

    render(<LinearIndex />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(cancel).toHaveBeenCalled();
  });

  it("Approve and Cancel are disabled during submitting stage", () => {
    const issues = [{ title: "Issue A", teamId: "t1" }];
    vi.mocked(useLinearReview).mockReturnValue(
      makeHook({ stage: "submitting", extractedIssues: issues }),
    );

    render(<LinearIndex />);

    expect(
      (screen.getByRole("button", { name: /approve/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /cancel/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("done stage displays the count of created issues", () => {
    const issues = [
      { title: "Issue A", teamId: "t1" },
      { title: "Issue B", teamId: "t1" },
      { title: "Issue C", teamId: "t1" },
    ];
    vi.mocked(useLinearReview).mockReturnValue(
      makeHook({ stage: "done", extractedIssues: issues }),
    );

    render(<LinearIndex />);

    expect(screen.getByText(/3 issues created/i)).toBeDefined();
  });

  it('"Start over" calls reset()', () => {
    const reset = vi.fn();
    vi.mocked(useLinearReview).mockReturnValue(
      makeHook({ stage: "done", reset }),
    );

    render(<LinearIndex />);

    fireEvent.click(screen.getByRole("button", { name: /start over/i }));

    expect(reset).toHaveBeenCalled();
  });
});
