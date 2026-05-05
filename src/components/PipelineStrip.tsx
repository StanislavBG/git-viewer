import { useGitData } from '../data/loader';

export function PipelineStrip() {
  const { pipeline } = useGitData();
  return (
    <div className="pipeline-strip">
      <div className="left">
        <div className="pulse"></div>
        <span>
          <span className="key">offline pipeline</span> · last sync {pipeline.lastRun}
        </span>
        <span>·</span>
        <span>{pipeline.scanned} repos scanned</span>
        <span>·</span>
        <span>{pipeline.newCommits} new commits indexed</span>
        <span>·</span>
        <span>duration {pipeline.duration}</span>
      </div>
      <div className="right">
        <span>local → /dashboard/update</span>
        <a className="cli">$ pnpm sync</a>
      </div>
    </div>
  );
}
