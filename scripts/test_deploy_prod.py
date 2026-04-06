import unittest

from scripts.deploy_prod import build_remote_deploy_script, normalize_services


class NormalizeServicesTests(unittest.TestCase):
    def test_expands_all(self):
        self.assertEqual(normalize_services("all"), ["api", "web", "admin"])

    def test_supports_csv_without_duplicates(self):
        self.assertEqual(normalize_services("api,web,api"), ["api", "web"])

    def test_rejects_unknown_service(self):
        with self.assertRaisesRegex(ValueError, "worker"):
            normalize_services("api,worker")


class BuildRemoteDeployScriptTests(unittest.TestCase):
    def test_includes_expected_rollout_steps(self):
        script = build_remote_deploy_script(
            services=["api", "web"],
            repo_path="/www/wwwroot/vsaas",
            env_file=".env.production",
            domain="https://a.newcn.cc",
        )

        self.assertIn("git pull origin master", script)
        self.assertIn(
            "docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build api web",
            script,
        )
        self.assertIn("./node_modules/.bin/prisma migrate deploy", script)
        self.assertIn("curl -I -sf https://a.newcn.cc/", script)
        self.assertIn("curl -sf https://a.newcn.cc/api/health", script)

    def test_can_skip_optional_steps(self):
        script = build_remote_deploy_script(
            services=["api"],
            skip_migrate=True,
            skip_cache_clear=True,
            skip_image_prune=True,
        )

        self.assertNotIn("prisma migrate deploy", script)
        self.assertNotIn("proxy_cache_dir", script)
        self.assertNotIn("docker image prune -f", script)


if __name__ == "__main__":
    unittest.main()
