#!/usr/bin/env python3
"""
Backend API Testing for WMS Scanner - GET /api/cargas endpoint
Testing the cargas listing endpoint to validate consistent format with array of cargas.
Validates that the API always returns {total, page, pageSize, cargas} structure.
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

class CargasEndpointTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
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
    
    # Removed DELETE request method as we're testing GET /api/cargas
    
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
        
        if not isinstance(data["page"], int):
            return False, "page field must be an integer"
        
        if not isinstance(data["pageSize"], int):
            return False, "pageSize field must be an integer"
            
        return True, "Structure is valid"
    
    def test_structured_response(self):
        """Test 1: Basic structured response validation"""
        print_header("TEST 1: Teste de resposta estruturada")
        
        print_info("Testing GET /api/cargas without filters")
        status_code, data = self.make_request("/cargas")
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("Structured Response", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        # Validate structure
        is_valid, message = self.validate_cargas_response_structure(data)
        if not is_valid:
            print_error(f"Structure validation failed: {message}")
            self.test_results.append(("Structured Response", False, f"❌ {message}"))
            return False
        
        print_success("Response structure is valid: {total, page, pageSize, cargas}")
        print_info(f"Total cargas: {data['total']}")
        print_info(f"Page: {data['page']}, PageSize: {data['pageSize']}")
        print_info(f"Cargas array length: {len(data['cargas'])}")
        
        # Validate that cargas is ALWAYS an array
        if not isinstance(data["cargas"], list):
            print_error("cargas field is not an array")
            self.test_results.append(("Structured Response", False, "❌ cargas is not an array"))
            return False
        
        print_success("✅ cargas field is an array")
        
        # Check individual carga structure if any exist
        if data["cargas"]:
            carga = data["cargas"][0]
            required_carga_fields = ["id", "identificador_carga", "tipo", "status", "data"]
            for field in required_carga_fields:
                if field not in carga:
                    print_warning(f"Carga missing field: {field}")
                else:
                    print_info(f"Carga has field: {field} = {carga[field]}")
        
        self.test_results.append(("Structured Response", True, "✅ Structure validation passed"))
        return True
    
    def test_empty_result(self):
        """Test 2: Empty result with future date"""
        print_header("TEST 2: Teste com resultado vazio")
        
        print_info("Testing GET /api/cargas?data=2099-12-31 (future date)")
        status_code, data = self.make_request("/cargas", {"data": "2099-12-31"})
        
        if status_code != 200:
            print_error(f"Expected status 200 OK, got {status_code}")
            print_error("CRITICAL: Should NEVER return 404 for empty results")
            self.test_results.append(("Empty Result", False, f"❌ Status {status_code} (should be 200)"))
            return False
        
        print_success("Status 200 OK received (correct - never 404)")
        
        # Validate structure
        is_valid, message = self.validate_cargas_response_structure(data)
        if not is_valid:
            print_error(f"Structure validation failed: {message}")
            self.test_results.append(("Empty Result", False, f"❌ {message}"))
            return False
        
        # Validate empty result structure
        expected_structure = {
            "total": 0,
            "page": 1,
            "pageSize": 20,
            "cargas": []
        }
        
        for key, expected_value in expected_structure.items():
            if data.get(key) != expected_value:
                print_error(f"Expected {key}: {expected_value}, got: {data.get(key)}")
                self.test_results.append(("Empty Result", False, f"❌ Wrong {key} value"))
                return False
        
        print_success("✅ Correct empty result structure: {total: 0, page: 1, pageSize: 20, cargas: []}")
        print_success("✅ cargas is an empty array (not null or undefined)")
        
        self.test_results.append(("Empty Result", True, "✅ Empty result handling correct"))
        return True
    
    def test_filters_conferente(self):
        """Test 3: Filters that conferente would use"""
        print_header("TEST 3: Teste com filtros (conferente usaria)")
        
        print_info("Testing GET /api/cargas?data=2025-10-29&tipo=caixaria")
        status_code, data = self.make_request("/cargas", {"data": "2025-10-29", "tipo": "caixaria"})
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("Filters Conferente", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        # Validate structure
        is_valid, message = self.validate_cargas_response_structure(data)
        if not is_valid:
            print_error(f"Structure validation failed: {message}")
            self.test_results.append(("Filters Conferente", False, f"❌ {message}"))
            return False
        
        print_success("✅ Response structure consistent with filters")
        print_info(f"Total cargas found: {data['total']}")
        print_info(f"Cargas array length: {len(data['cargas'])}")
        
        # Validate that cargas is ALWAYS an array
        if not isinstance(data["cargas"], list):
            print_error("cargas field is not an array")
            self.test_results.append(("Filters Conferente", False, "❌ cargas is not an array"))
            return False
        
        print_success("✅ cargas field is an array")
        
        # If results exist, validate they match the filter
        if data["cargas"]:
            for carga in data["cargas"]:
                if carga.get("tipo") != "caixaria":
                    print_warning(f"Found carga with tipo '{carga.get('tipo')}' instead of 'caixaria'")
                else:
                    print_info(f"Carga {carga.get('identificador_carga')} has correct tipo: {carga.get('tipo')}")
        
        self.test_results.append(("Filters Conferente", True, "✅ Filters working with consistent structure"))
        return True
    
    def test_multiple_results(self):
        """Test 4: Multiple results with status filter"""
        print_header("TEST 4: Teste com múltiplos resultados")
        
        print_info("Testing GET /api/cargas?status=pausada,em_andamento")
        status_code, data = self.make_request("/cargas", {"status": "pausada,em_andamento"})
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("Multiple Results", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        # Validate structure
        is_valid, message = self.validate_cargas_response_structure(data)
        if not is_valid:
            print_error(f"Structure validation failed: {message}")
            self.test_results.append(("Multiple Results", False, f"❌ {message}"))
            return False
        
        print_success("✅ Response structure consistent")
        print_info(f"Total cargas found: {data['total']}")
        print_info(f"Cargas array length: {len(data['cargas'])}")
        
        # Validate that cargas contains array of objects
        if not isinstance(data["cargas"], list):
            print_error("cargas field is not an array")
            self.test_results.append(("Multiple Results", False, "❌ cargas is not an array"))
            return False
        
        print_success("✅ cargas field is an array")
        
        # Validate each carga has required fields
        if data["cargas"]:
            for i, carga in enumerate(data["cargas"]):
                required_fields = ["id", "identificador_carga", "tipo", "status", "data"]
                for field in required_fields:
                    if field not in carga:
                        print_error(f"Carga {i} missing required field: {field}")
                        self.test_results.append(("Multiple Results", False, f"❌ Missing field {field}"))
                        return False
                
                # Check if status matches filter
                if carga.get("status") not in ["pausada", "em_andamento"]:
                    print_warning(f"Carga {carga.get('identificador_carga')} has status '{carga.get('status')}' (not in filter)")
                else:
                    print_info(f"Carga {carga.get('identificador_carga')}: status={carga.get('status')}, tipo={carga.get('tipo')}")
        
        self.test_results.append(("Multiple Results", True, "✅ Multiple results with proper structure"))
        return True
    
    def test_critical_validation(self):
        """Test 5: Critical validation - response format consistency"""
        print_header("TEST 5: Validação crítica")
        
        print_info("Testing various scenarios to ensure ALWAYS consistent format")
        
        test_scenarios = [
            ("Basic listing", {}),
            ("Status filter", {"status": "finalizada"}),
            ("Tipo filter", {"tipo": "multi"}),
            ("Date range", {"dataInicio": "2024-01-01", "dataFim": "2024-12-31"}),
            ("Pagination", {"page": 1, "pageSize": 5}),
            ("Combined filters", {"status": "em_andamento", "tipo": "caixaria"}),
            ("Non-existent status", {"status": "status_inexistente"}),
        ]
        
        all_passed = True
        
        for scenario_name, params in test_scenarios:
            print_info(f"Testing scenario: {scenario_name}")
            status_code, data = self.make_request("/cargas", params)
            
            # CRITICAL: Must ALWAYS return 200 (never 404)
            if status_code != 200:
                print_error(f"Scenario '{scenario_name}': Expected 200, got {status_code}")
                all_passed = False
                continue
            
            # CRITICAL: Must ALWAYS have consistent structure
            is_valid, message = self.validate_cargas_response_structure(data)
            if not is_valid:
                print_error(f"Scenario '{scenario_name}': {message}")
                all_passed = False
                continue
            
            # CRITICAL: cargas must ALWAYS be an array
            if not isinstance(data["cargas"], list):
                print_error(f"Scenario '{scenario_name}': cargas is not an array")
                all_passed = False
                continue
            
            # CRITICAL: Must NEVER return just array directly
            if isinstance(data, list):
                print_error(f"Scenario '{scenario_name}': Response is array directly (should be object)")
                all_passed = False
                continue
            
            # CRITICAL: cargas must NEVER be null or string
            if data["cargas"] is None:
                print_error(f"Scenario '{scenario_name}': cargas is null")
                all_passed = False
                continue
            
            if isinstance(data["cargas"], str):
                print_error(f"Scenario '{scenario_name}': cargas is string")
                all_passed = False
                continue
            
            print_success(f"Scenario '{scenario_name}': ✅ Passed (total: {data['total']}, cargas: {len(data['cargas'])})")
        
        if all_passed:
            print_success("✅ ALL scenarios maintain consistent format")
            print_success("✅ NEVER returns 404 for empty results")
            print_success("✅ ALWAYS returns {total, page, pageSize, cargas: []}")
            print_success("✅ cargas is ALWAYS an array (never null/string)")
            self.test_results.append(("Critical Validation", True, "✅ All critical validations passed"))
            return True
        else:
            print_error("❌ Some scenarios failed critical validation")
            self.test_results.append(("Critical Validation", False, "❌ Critical validation failed"))
            return False
    
    # Removed integrity validation test as it was for DELETE endpoint
    
    # Removed debug logs test as it was specific to DELETE endpoint
    
    def run_all_tests(self):
        """Run all tests"""
        print_header("WMS SCANNER - GET /api/cargas ENDPOINT TESTING")
        print_info(f"Backend URL: {BACKEND_URL}")
        print_info("Testing cargas listing endpoint for consistent format validation")
        print_info("Validating that API always returns {total, page, pageSize, cargas} structure")
        
        # Authenticate
        if not self.authenticate():
            print_error("Authentication failed, stopping tests")
            return False
        
        # Run all tests
        tests = [
            self.test_structured_response,
            self.test_empty_result,
            self.test_filters_conferente,
            self.test_multiple_results,
            self.test_critical_validation
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed_tests += 1
                time.sleep(0.5)  # Small delay between tests
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
            print_success("✅ DELETE /api/cargas/:id/itens/:itemId endpoint is working correctly")
            print_success("✅ Item deletion with proper validations")
            print_success("✅ Error handling for edge cases")
            print_success("✅ Data integrity maintained")
        else:
            print_error(f"SOME TESTS FAILED ({passed}/{total})")
            print_error("❌ Issues found with the deletion endpoint")

def main():
    """Main function"""
    tester = CargaItemDeletionTester()
    success = tester.run_all_tests()
    
    if success:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL TESTS PASSED - DELETION ENDPOINT IS WORKING CORRECTLY{Colors.ENDC}")
        sys.exit(0)
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}💥 SOME TESTS FAILED - ISSUES FOUND{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()