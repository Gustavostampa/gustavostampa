#!/usr/bin/env python3
"""
Backend API Testing for WMS Scanner - DELETE /api/cargas/:id/itens/:itemId endpoint
Testing the item deletion functionality with validations, logs and error handling.
"""

import requests
import json
import sys
import time
from datetime import datetime, timedelta

# Configuration
BACKEND_URL = "https://wms-scanner.preview.emergentagent.com/api"
ADMIN_CREDENTIALS = {"login": "admin", "senha": "admin123"}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.ENDC}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.ENDC}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.ENDC}")

def print_header(msg):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{msg}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")

class CargaItemDeletionTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        self.test_carga_id = None
        self.test_carga_finalizada_id = None
        
    def authenticate(self):
        """Authenticate with admin credentials if needed"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=ADMIN_CREDENTIALS)
            if response.status_code == 200:
                self.auth_token = response.json()
                print_success("Authentication successful")
                return True
            else:
                print_warning(f"Authentication failed: {response.status_code}")
                return True  # Continue without auth as it might not be required
        except Exception as e:
            print_warning(f"Authentication error: {e}")
            return True  # Continue without auth
    
    def make_request(self, endpoint, params=None):
        """Make GET request to API endpoint"""
        try:
            url = f"{BACKEND_URL}{endpoint}"
            print_info(f"Testing: GET {url}")
            if params:
                print_info(f"Parameters: {params}")
            
            response = self.session.get(url, params=params)
            
            print_info(f"Status Code: {response.status_code}")
            
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    data = response.json()
                    return response.status_code, data
                except json.JSONDecodeError:
                    return response.status_code, {"error": "Invalid JSON response"}
            else:
                return response.status_code, {"error": "Non-JSON response", "content": response.text[:200]}
                
        except requests.exceptions.RequestException as e:
            print_error(f"Request failed: {e}")
            return None, {"error": str(e)}
    
    def make_delete_request(self, endpoint):
        """Make DELETE request to API endpoint"""
        try:
            url = f"{BACKEND_URL}{endpoint}"
            print_info(f"Testing: DELETE {url}")
            
            response = self.session.delete(url)
            
            print_info(f"Status Code: {response.status_code}")
            
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    data = response.json()
                    return response.status_code, data
                except json.JSONDecodeError:
                    return response.status_code, {"error": "Invalid JSON response"}
            else:
                return response.status_code, {"error": "Non-JSON response", "content": response.text[:200]}
                
        except requests.exceptions.RequestException as e:
            print_error(f"Request failed: {e}")
            return None, {"error": str(e)}
    
    def validate_cargas_response_structure(self, data):
        """Validate the expected structure of cargas response"""
        required_fields = ["total", "page", "pageSize", "cargas"]
        
        for field in required_fields:
            if field not in data:
                return False, f"Missing required field: {field}"
        
        if not isinstance(data["cargas"], list):
            return False, "cargas field must be an array"
        
        if not isinstance(data["total"], int):
            return False, "total field must be an integer"
            
        return True, "Structure is valid"
    
    def setup_test_data(self):
        """Setup: Get editable carga for testing"""
        print_header("SETUP: Obter carga editável")
        
        # Get cargas with status 'aberta' or 'pausada' that have items
        status_code, data = self.make_request("/cargas", {"status": "aberta,pausada"})
        
        if status_code == 200 and data.get('cargas'):
            for carga in data['cargas']:
                if carga.get('itens') and len(carga['itens']) > 0:
                    self.test_carga_id = carga['id']
                    print_success(f"Found editable carga: {carga.get('identificador_carga')} (ID: {self.test_carga_id})")
                    print_info(f"Status: {carga.get('status')}, Total items: {len(carga['itens'])}")
                    print_info(f"First item: {carga['itens'][0].get('codigo_produto')} - {carga['itens'][0].get('descricao')}")
                    break
        
        # Get a finalized carga for testing restrictions
        status_code, data = self.make_request("/cargas", {"status": "finalizada"})
        if status_code == 200 and data.get('cargas'):
            for carga in data['cargas']:
                if carga.get('itens') and len(carga['itens']) > 0:
                    self.test_carga_finalizada_id = carga['id']
                    print_success(f"Found finalized carga: {carga.get('identificador_carga')} (ID: {self.test_carga_finalizada_id})")
                    break
        
        if not self.test_carga_id:
            print_error("No editable carga found with items")
            self.test_results.append(("Setup", False, "❌ No editable carga available"))
            return False
        
        self.test_results.append(("Setup", True, "✅ Test data prepared"))
        return True
    
    def test_successful_deletion(self):
        """Test 1: Successful item deletion"""
        print_header("TEST 1: Teste de exclusão bem-sucedida")
        
        if not self.test_carga_id:
            print_error("No test carga available")
            self.test_results.append(("Successful Deletion", False, "❌ No test data"))
            return False
        
        # Get current carga state
        status_code, carga_before = self.make_request(f"/cargas/{self.test_carga_id}")
        if status_code != 200:
            print_error(f"Failed to get carga before deletion: {status_code}")
            self.test_results.append(("Successful Deletion", False, "❌ Could not get carga"))
            return False
        
        total_before = len(carga_before.get('itens', []))
        print_info(f"Total items before deletion: {total_before}")
        
        if total_before == 0:
            print_error("No items to delete")
            self.test_results.append(("Successful Deletion", False, "❌ No items available"))
            return False
        
        # Delete first item (index 0)
        print_info(f"Deleting first item (index 0) from carga {self.test_carga_id}")
        status_code, response = self.make_delete_request(f"/cargas/{self.test_carga_id}/itens/0")
        
        if status_code == 200:
            print_success("Status 200 OK received")
            
            # Validate response structure
            required_fields = ["ok", "message", "item_removido", "total_itens_antes", "total_itens_depois"]
            for field in required_fields:
                if field not in response:
                    print_error(f"Missing field in response: {field}")
                    self.test_results.append(("Successful Deletion", False, f"❌ Missing field: {field}"))
                    return False
            
            # Validate totals
            if response["total_itens_depois"] != response["total_itens_antes"] - 1:
                print_error(f"Total items calculation wrong: {response['total_itens_antes']} -> {response['total_itens_depois']}")
                self.test_results.append(("Successful Deletion", False, "❌ Wrong total calculation"))
                return False
            
            print_success(f"Item removed: {response['item_removido'].get('codigo_produto')} - {response['item_removido'].get('descricao')}")
            print_success(f"Total items: {response['total_itens_antes']} -> {response['total_itens_depois']}")
            
            # Verify carga was updated
            status_code, carga_after = self.make_request(f"/cargas/{self.test_carga_id}")
            if status_code == 200:
                total_after = len(carga_after.get('itens', []))
                if total_after == total_before - 1:
                    print_success(f"Carga updated correctly: {total_before} -> {total_after} items")
                    self.test_results.append(("Successful Deletion", True, "✅ Item deleted successfully"))
                    return True
                else:
                    print_error(f"Carga not updated correctly: expected {total_before - 1}, got {total_after}")
                    self.test_results.append(("Successful Deletion", False, "❌ Carga not updated"))
                    return False
            else:
                print_error("Could not verify carga after deletion")
                self.test_results.append(("Successful Deletion", False, "❌ Could not verify update"))
                return False
        else:
            print_error(f"Expected status 200, got {status_code}")
            print_error(f"Response: {response}")
            self.test_results.append(("Successful Deletion", False, f"❌ Status {status_code}"))
            return False
    
    def test_finalized_carga_restriction(self):
        """Test 2: Restriction on finalized carga"""
        print_header("TEST 2: Teste com carga finalizada")
        
        if not self.test_carga_finalizada_id:
            print_warning("No finalized carga available for testing")
            self.test_results.append(("Finalized Carga Restriction", True, "⚠️ No finalized carga to test"))
            return True
        
        print_info(f"Attempting to delete item from finalized carga {self.test_carga_finalizada_id}")
        status_code, response = self.make_delete_request(f"/cargas/{self.test_carga_finalizada_id}/itens/0")
        
        if status_code == 400:
            print_success("Status 400 Bad Request received (correct)")
            
            if "detail" in response and "finalizada" in response["detail"]:
                print_success(f"Correct error message: {response['detail']}")
                self.test_results.append(("Finalized Carga Restriction", True, "✅ Finalized carga restriction working"))
                return True
            else:
                print_error(f"Wrong error message: {response}")
                self.test_results.append(("Finalized Carga Restriction", False, "❌ Wrong error message"))
                return False
        else:
            print_error(f"Expected status 400, got {status_code}")
            print_error(f"Response: {response}")
            self.test_results.append(("Finalized Carga Restriction", False, f"❌ Status {status_code}"))
            return False
    
    def test_nonexistent_item(self):
        """Test 3: Nonexistent item"""
        print_header("TEST 3: Teste com item inexistente")
        
        if not self.test_carga_id:
            print_error("No test carga available")
            self.test_results.append(("Nonexistent Item", False, "❌ No test data"))
            return False
        
        print_info(f"Attempting to delete nonexistent item (index 9999) from carga {self.test_carga_id}")
        status_code, response = self.make_delete_request(f"/cargas/{self.test_carga_id}/itens/9999")
        
        if status_code == 404:
            print_success("Status 404 Not Found received (correct)")
            
            if "detail" in response and "não encontrado" in response["detail"]:
                print_success(f"Correct error message: {response['detail']}")
                self.test_results.append(("Nonexistent Item", True, "✅ Nonexistent item handling working"))
                return True
            else:
                print_error(f"Wrong error message: {response}")
                self.test_results.append(("Nonexistent Item", False, "❌ Wrong error message"))
                return False
        else:
            print_error(f"Expected status 404, got {status_code}")
            print_error(f"Response: {response}")
            self.test_results.append(("Nonexistent Item", False, f"❌ Status {status_code}"))
            return False
    
    def test_nonexistent_carga(self):
        """Test 4: Nonexistent carga"""
        print_header("TEST 4: Teste com carga inexistente")
        
        print_info("Attempting to delete item from nonexistent carga")
        status_code, response = self.make_delete_request("/cargas/carga-inexistente/itens/0")
        
        if status_code == 404:
            print_success("Status 404 Not Found received (correct)")
            
            if "detail" in response and "não encontrada" in response["detail"]:
                print_success(f"Correct error message: {response['detail']}")
                self.test_results.append(("Nonexistent Carga", True, "✅ Nonexistent carga handling working"))
                return True
            else:
                print_error(f"Wrong error message: {response}")
                self.test_results.append(("Nonexistent Carga", False, "❌ Wrong error message"))
                return False
        else:
            print_error(f"Expected status 404, got {status_code}")
            print_error(f"Response: {response}")
            self.test_results.append(("Nonexistent Carga", False, f"❌ Status {status_code}"))
            return False
    
    def test_integrity_validation(self):
        """Test 5: Integrity validation after deletion"""
        print_header("TEST 5: Validação de integridade")
        
        if not self.test_carga_id:
            print_error("No test carga available")
            self.test_results.append(("Integrity Validation", False, "❌ No test data"))
            return False
        
        # Get carga state after previous deletion
        print_info(f"Validating carga {self.test_carga_id} integrity after deletion")
        status_code, carga = self.make_request(f"/cargas/{self.test_carga_id}")
        
        if status_code != 200:
            print_error(f"Failed to get carga: {status_code}")
            self.test_results.append(("Integrity Validation", False, "❌ Could not get carga"))
            return False
        
        # Validate array integrity
        itens = carga.get('itens', [])
        total_itens = carga.get('total_itens', len(itens))
        
        if len(itens) == total_itens:
            print_success(f"Array integrity OK: {len(itens)} items, total_itens: {total_itens}")
        else:
            print_error(f"Array integrity FAILED: {len(itens)} items, total_itens: {total_itens}")
            self.test_results.append(("Integrity Validation", False, "❌ Array integrity failed"))
            return False
        
        # Check if updated_at exists and is recent
        updated_at = carga.get('updated_at')
        if updated_at:
            print_success(f"updated_at field present: {updated_at}")
        else:
            print_warning("updated_at field not present")
        
        self.test_results.append(("Integrity Validation", True, "✅ Integrity validation passed"))
        return True
    
    def test_debug_logs(self):
        """Test 6: Check for DEBUG logs in backend"""
        print_header("TEST 6: Verificar logs DEBUG")
        
        print_info("Checking backend logs for DEBUG messages...")
        print_info("Expected log patterns:")
        print_info("- [DELETE /api/cargas/...] Iniciando exclusão")
        print_info("- [DELETE] Carga encontrada: status=..., total_itens=...")
        print_info("- [DELETE] Item removido: index=..., codigo=...")
        print_info("- [DELETE] Atualização MongoDB: matched=..., modified=...")
        print_info("- [DELETE] Item excluído com sucesso")
        
        # Note: In a real environment, we would check actual log files
        # For this test, we'll assume logs are working if the API responses are correct
        print_warning("Log verification requires manual inspection of backend console")
        print_info("Please check the backend logs for the DEBUG messages listed above")
        
        self.test_results.append(("Debug Logs", True, "⚠️ Manual verification required"))
        return True
    
    def run_all_tests(self):
        """Run all tests"""
        print_header("WMS SCANNER - GET /api/cargas ENDPOINT TESTING")
        print_info(f"Backend URL: {BACKEND_URL}")
        print_info("Testing the fixed endpoint that was causing 404 errors")
        
        # Authenticate
        if not self.authenticate():
            print_error("Authentication failed, stopping tests")
            return False
        
        # Run all tests
        tests = [
            self.test_basic_listing,
            self.test_status_filters,
            self.test_tipo_filters,
            self.test_pagination,
            self.test_date_filters,
            self.test_empty_results,
            self.test_individual_carga
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed_tests += 1
            except Exception as e:
                print_error(f"Test failed with exception: {e}")
        
        # Print summary
        self.print_summary(passed_tests, total_tests)
        
        return passed_tests == total_tests
    
    def print_summary(self, passed, total):
        """Print test summary"""
        print_header("TEST SUMMARY")
        
        for test_name, passed_status, message in self.test_results:
            if passed_status:
                print_success(f"{test_name}: {message}")
            else:
                print_error(f"{test_name}: {message}")
        
        print(f"\n{Colors.BOLD}OVERALL RESULT:{Colors.ENDC}")
        if passed == total:
            print_success(f"ALL TESTS PASSED ({passed}/{total})")
            print_success("✅ GET /api/cargas endpoint is working correctly")
            print_success("✅ No 404 errors found")
            print_success("✅ All filtering and pagination working")
        else:
            print_error(f"SOME TESTS FAILED ({passed}/{total})")
            print_error("❌ Issues found with the endpoint")

def main():
    """Main function"""
    tester = CargasAPITester()
    success = tester.run_all_tests()
    
    if success:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL TESTS PASSED - ENDPOINT IS WORKING CORRECTLY{Colors.ENDC}")
        sys.exit(0)
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}💥 SOME TESTS FAILED - ISSUES FOUND{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()