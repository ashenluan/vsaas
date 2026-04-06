import unittest

from scripts._prod_ssh import DEFAULT_HOST, DEFAULT_PORT, DEFAULT_USER, load_prod_ssh_config


class LoadProdSshConfigTests(unittest.TestCase):
    def test_requires_password(self):
        with self.assertRaisesRegex(RuntimeError, "VSAAS_PROD_PASSWORD"):
            load_prod_ssh_config({})

    def test_uses_defaults_when_host_user_port_missing(self):
        config = load_prod_ssh_config({"VSAAS_PROD_PASSWORD": "secret"})

        self.assertEqual(config.host, DEFAULT_HOST)
        self.assertEqual(config.port, DEFAULT_PORT)
        self.assertEqual(config.user, DEFAULT_USER)
        self.assertEqual(config.password, "secret")

    def test_supports_explicit_host_user_port(self):
        config = load_prod_ssh_config(
            {
                "VSAAS_PROD_HOST": "example.com",
                "VSAAS_PROD_PORT": "2222",
                "VSAAS_PROD_USER": "deploy",
                "VSAAS_PROD_PASSWORD": "secret",
            }
        )

        self.assertEqual(config.host, "example.com")
        self.assertEqual(config.port, 2222)
        self.assertEqual(config.user, "deploy")
        self.assertEqual(config.password, "secret")


if __name__ == "__main__":
    unittest.main()
