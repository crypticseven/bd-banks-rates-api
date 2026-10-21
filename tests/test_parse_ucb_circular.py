import unittest
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parents[1]))

from scripts.parse_ucb_circular import parse_circular


PDF = Path(
    os.environ.get(
        "UCB_CIRCULAR_PATH",
        r"C:\Users\fardi\Downloads\instruction-circular-no1634full-deposit-productsucb-websi.pdf",
    )
)


@unittest.skipUnless(PDF.exists(), "UCB ground-truth PDF is not available")
class UcbCircularParserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = parse_circular(PDF)
        cls.products = cls.result["products"]

    def test_document_is_verified_and_dated(self):
        self.assertEqual(self.result["verification_status"], "VERIFIED")
        self.assertEqual(self.result["effective_date"], "2026-10-01")
        self.assertEqual(self.result["extraction_confidence"], 1.0)

    def test_required_prefixes_and_rates_are_present(self):
        by_prefix = {product["product_prefix"]: product for product in self.products}
        for prefix in ("3523", "3572", "3524", "3525", "3526", "3527", "3528", "3529"):
            self.assertIn(prefix, by_prefix)
            self.assertEqual(by_prefix[prefix]["headline_rate"], 8.5)
        self.assertEqual(by_prefix["3583"]["headline_rate"], 8.5)
        self.assertEqual(by_prefix["3427"]["compounding_frequency"], "MONTHLY")
        self.assertEqual(by_prefix["3428"]["compounding_frequency"], "QUARTERLY")
        self.assertEqual(by_prefix["3429"]["compounding_frequency"], "HALF_YEARLY")

    def test_fixed_deposit_rates_are_explicit(self):
        fixed = [
            product for product in self.products
            if product["official_product_name"] == "Retail Fixed Deposit (exclusive)"
        ]
        self.assertEqual(
            {(product["tenure_display"], product["headline_rate"]) for product in fixed},
            {("90 days", 8.25), ("180 days", 8.5), ("360 days", 8.0)},
        )

    def test_discontinued_products_are_retained(self):
        discontinued = {
            product["product_prefix"]: product
            for product in self.products
            if product["status"] == "DISCONTINUED"
        }
        self.assertEqual(set(discontinued), {"3207", "3213", "3301"})
        self.assertTrue(all(product["headline_rate"] is None for product in discontinued.values()))

    def test_no_duplicate_prefixes_or_empty_names(self):
        prefixes = [product["product_prefix"] for product in self.products if product["product_prefix"]]
        self.assertEqual(len(prefixes), len(set(prefixes)))
        self.assertTrue(all(product["official_product_name"].strip() for product in self.products))


if __name__ == "__main__":
    unittest.main()
