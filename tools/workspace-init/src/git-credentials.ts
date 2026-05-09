export interface GitCredentialsClient {
  fetch(): Promise<{ username: string; password: string }>;
}

export function createGitCredentialsClient(input: {
  paperclipPublicUrl: string;
  runJwt: string;
  repoUrl: string;
}): GitCredentialsClient {
  return {
    async fetch() {
      const res = await fetch(`${input.paperclipPublicUrl}/api/workspace/git-credentials`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${input.runJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl: input.repoUrl }),
      });
      if (!res.ok) {
        throw new Error(`git-credentials fetch failed (${res.status}): ${await res.text()}`);
      }
      const body = (await res.json()) as { username?: string; password?: string };
      if (!body.username || !body.password) {
        throw new Error("git-credentials response missing username/password");
      }
      return { username: body.username, password: body.password };
    },
  };
}
