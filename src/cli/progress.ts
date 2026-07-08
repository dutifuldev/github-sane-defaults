import type {
  ApplyProgress,
  ApplyProgressAppliedRepo,
  ApplyProgressSelectedRepos,
  PlanProgress,
  PlanProgressLoadedRepoDetails,
  PlanProgressLoadingRepoDetails,
  PlanProgressPlannedRepo,
  PlanProgressSelectedRepos
} from "../app/types.js";

export type ProgressMode = "auto" | "always" | "never";

export type ProgressStream = {
  columns?: number;
  isTTY?: boolean;
  write(chunk: string): boolean;
};

export type ProgressEnvironment = {
  CI?: string;
};

export type ProgressReporter = ApplyProgress &
  PlanProgress & {
    stop(): void;
  };

export function createProgressReporter(
  mode: ProgressMode = "auto",
  stream: ProgressStream = process.stderr,
  environment: ProgressEnvironment = process.env
): ProgressReporter {
  if (!shouldShowProgress(mode, stream, environment)) {
    return new NoopProgressReporter();
  }

  return new StatusBarProgressReporter(stream);
}

function shouldShowProgress(
  mode: ProgressMode,
  stream: ProgressStream,
  environment: ProgressEnvironment
): boolean {
  if (mode === "always") {
    return true;
  }

  if (mode === "never") {
    return false;
  }

  return stream.isTTY === true && (environment.CI === undefined || environment.CI.length === 0);
}

class NoopProgressReporter implements ProgressReporter {
  public stop(): void {
    return undefined;
  }
}

class StatusBarProgressReporter implements ProgressReporter {
  private rendered = false;

  public constructor(private readonly stream: ProgressStream) {}

  public loadingRepos(owner: string): void {
    this.render(`Loading repositories for ${owner}...`);
  }

  public loadingRepoDetails(state: PlanProgressLoadingRepoDetails): void {
    this.render(formatRepoDetailsStatus({ ...state, completed: 0, current: "" }));
  }

  public loadedRepoDetails(state: PlanProgressLoadedRepoDetails): void {
    this.render(formatRepoDetailsStatus(state));
  }

  public selectedRepos(state: PlanProgressSelectedRepos): void {
    this.render(
      formatPlanningStatus({
        owner: state.owner,
        total: state.total,
        completed: 0,
        changed: 0,
        clean: 0,
        skipped: state.skipped,
        current: ""
      })
    );
  }

  public plannedRepo(state: PlanProgressPlannedRepo): void {
    this.render(formatPlanningStatus(state));
  }

  public applyingRepos(state: ApplyProgressSelectedRepos): void {
    this.render(formatApplyingStatus({ ...state, completed: 0, current: "" }));
  }

  public appliedRepo(state: ApplyProgressAppliedRepo): void {
    this.render(formatApplyingStatus(state));
  }

  public stop(): void {
    if (!this.rendered) {
      return;
    }

    this.stream.write("\r\x1b[K");
    this.rendered = false;
  }

  private render(message: string): void {
    this.stream.write(`\r${truncate(message, this.stream.columns)}\x1b[K`);
    this.rendered = true;
  }
}

function formatPlanningStatus(state: PlanProgressPlannedRepo): string {
  return formatBarStatus({
    label: `Planning ${state.owner}`,
    completed: state.completed,
    total: state.total,
    details: [
      `changed ${String(state.changed)}`,
      `clean ${String(state.clean)}`,
      `skipped ${String(state.skipped)}`
    ],
    current: state.current
  });
}

function formatRepoDetailsStatus(state: PlanProgressLoadedRepoDetails): string {
  return formatBarStatus({
    label: `Loading repository details for ${state.owner}`,
    completed: state.completed,
    total: state.total,
    details: [],
    current: state.current
  });
}

function formatApplyingStatus(state: ApplyProgressAppliedRepo): string {
  return formatBarStatus({
    label: `Applying ${state.owner}`,
    completed: state.completed,
    total: state.total,
    details: [],
    current: state.current
  });
}

type BarStatus = {
  label: string;
  completed: number;
  total: number;
  details: string[];
  current: string;
};

function formatBarStatus(status: BarStatus): string {
  const current = status.current.length > 0 ? [`current: ${status.current}`] : [];

  return [
    status.label,
    progressBar(status.completed, status.total),
    `${String(status.completed)}/${String(status.total)}`,
    ...status.details,
    ...current
  ].join("  ");
}

function progressBar(completed: number, total: number): string {
  const width = 20;
  const rawFilled = total === 0 ? 0 : Math.floor((completed / total) * width);
  const filled = Math.min(width, Math.max(0, rawFilled));
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
}

function truncate(message: string, columns: number | undefined): string {
  if (columns === undefined || columns <= 0 || message.length <= columns) {
    return message;
  }

  if (columns <= 1) {
    return "";
  }

  return message.slice(0, columns - 1);
}
