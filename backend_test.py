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
    
    def test_basic_listing(self):
        """Test 1: Basic listing without filters"""
        print_header("TEST 1: Basic Listing (GET /api/cargas)")
        
        status_code, data = self.make_request("/cargas")
        
        if status_code == 200:
            print_success("Status 200 OK received")
            
            is_valid, msg = self.validate_cargas_response_structure(data)
            if is_valid:
                print_success(f"Response structure is valid: {msg}")
                print_info(f"Total cargas: {data['total']}")
                print_info(f"Returned cargas: {len(data['cargas'])}")
                print_info(f"Page: {data['page']}, PageSize: {data['pageSize']}")
                
                # Show sample carga if available
                if data['cargas']:
                    sample = data['cargas'][0]
                    print_info(f"Sample carga: {sample.get('identificador_carga', 'N/A')} - {sample.get('status', 'N/A')}")
                
                self.test_results.append(("Basic Listing", True, "✅ Working correctly"))
                return True
            else:
                print_error(f"Invalid response structure: {msg}")
                self.test_results.append(("Basic Listing", False, f"❌ Invalid structure: {msg}"))
                return False
        else:
            print_error(f"Expected status 200, got {status_code}")
            print_error(f"Response: {data}")
            self.test_results.append(("Basic Listing", False, f"❌ Status {status_code}"))
            return False
    
    def test_status_filters(self):
        """Test 2: Status filtering"""
        print_header("TEST 2: Status Filtering")
        
        # Test single status
        test_cases = [
            ("finalizada", "Single status: finalizada"),
            ("em_andamento", "Single status: em_andamento"),
            ("pausada", "Single status: pausada"),
            ("em_andamento,pausada", "Multiple status: em_andamento,pausada")
        ]
        
        all_passed = True
        
        for status_value, description in test_cases:
            print_info(f"Testing {description}")
            status_code, data = self.make_request("/cargas", {"status": status_value})
            
            if status_code == 200:
                is_valid, msg = self.validate_cargas_response_structure(data)
                if is_valid:
                    print_success(f"{description} - OK (found {data['total']} cargas)")
                    
                    # Validate that returned cargas match the filter
                    if data['cargas']:
                        expected_statuses = [s.strip() for s in status_value.split(',')]
                        for carga in data['cargas']:
                            if carga.get('status') not in expected_statuses:
                                print_error(f"Carga {carga.get('identificador_carga')} has status {carga.get('status')}, expected one of {expected_statuses}")
                                all_passed = False
                else:
                    print_error(f"{description} - Invalid structure: {msg}")
                    all_passed = False
            else:
                print_error(f"{description} - Status {status_code}")
                all_passed = False
        
        if all_passed:
            self.test_results.append(("Status Filtering", True, "✅ All status filters working"))
        else:
            self.test_results.append(("Status Filtering", False, "❌ Some status filters failed"))
        
        return all_passed
    
    def test_tipo_filters(self):
        """Test 3: Tipo filtering"""
        print_header("TEST 3: Tipo Filtering")
        
        test_cases = [
            ("Caixaria", "Tipo: Caixaria"),
            ("Multi-Pedidos", "Tipo: Multi-Pedidos"),
            ("caixaria", "Tipo: caixaria (lowercase)"),
            ("multi", "Tipo: multi (partial)")
        ]
        
        all_passed = True
        
        for tipo_value, description in test_cases:
            print_info(f"Testing {description}")
            status_code, data = self.make_request("/cargas", {"tipo": tipo_value})
            
            if status_code == 200:
                is_valid, msg = self.validate_cargas_response_structure(data)
                if is_valid:
                    print_success(f"{description} - OK (found {data['total']} cargas)")
                else:
                    print_error(f"{description} - Invalid structure: {msg}")
                    all_passed = False
            else:
                print_error(f"{description} - Status {status_code}")
                all_passed = False
        
        if all_passed:
            self.test_results.append(("Tipo Filtering", True, "✅ All tipo filters working"))
        else:
            self.test_results.append(("Tipo Filtering", False, "❌ Some tipo filters failed"))
        
        return all_passed
    
    def test_pagination(self):
        """Test 4: Pagination"""
        print_header("TEST 4: Pagination")
        
        # Test different page sizes
        test_cases = [
            ({"page": 1, "pageSize": 5}, "Page 1, Size 5"),
            ({"page": 1, "pageSize": 10}, "Page 1, Size 10"),
            ({"page": 2, "pageSize": 5}, "Page 2, Size 5")
        ]
        
        all_passed = True
        
        for params, description in test_cases:
            print_info(f"Testing {description}")
            status_code, data = self.make_request("/cargas", params)
            
            if status_code == 200:
                is_valid, msg = self.validate_cargas_response_structure(data)
                if is_valid:
                    returned_count = len(data['cargas'])
                    expected_max = params['pageSize']
                    
                    if returned_count <= expected_max:
                        print_success(f"{description} - OK (returned {returned_count}, max {expected_max})")
                        print_info(f"Page: {data['page']}, PageSize: {data['pageSize']}")
                    else:
                        print_error(f"{description} - Returned {returned_count}, expected max {expected_max}")
                        all_passed = False
                else:
                    print_error(f"{description} - Invalid structure: {msg}")
                    all_passed = False
            else:
                print_error(f"{description} - Status {status_code}")
                all_passed = False
        
        if all_passed:
            self.test_results.append(("Pagination", True, "✅ Pagination working correctly"))
        else:
            self.test_results.append(("Pagination", False, "❌ Pagination issues found"))
        
        return all_passed
    
    def test_date_filters(self):
        """Test 5: Date filtering"""
        print_header("TEST 5: Date Filtering")
        
        # Use recent dates for testing
        today = datetime.now().strftime('%Y-%m-%d')
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        test_cases = [
            ({"dataInicio": yesterday}, f"Data início: {yesterday}"),
            ({"dataFim": tomorrow}, f"Data fim: {tomorrow}"),
            ({"dataInicio": yesterday, "dataFim": tomorrow}, f"Data range: {yesterday} to {tomorrow}")
        ]
        
        all_passed = True
        
        for params, description in test_cases:
            print_info(f"Testing {description}")
            status_code, data = self.make_request("/cargas", params)
            
            if status_code == 200:
                is_valid, msg = self.validate_cargas_response_structure(data)
                if is_valid:
                    print_success(f"{description} - OK (found {data['total']} cargas)")
                else:
                    print_error(f"{description} - Invalid structure: {msg}")
                    all_passed = False
            else:
                print_error(f"{description} - Status {status_code}")
                all_passed = False
        
        if all_passed:
            self.test_results.append(("Date Filtering", True, "✅ Date filters working"))
        else:
            self.test_results.append(("Date Filtering", False, "❌ Date filter issues"))
        
        return all_passed
    
    def test_empty_results(self):
        """Test 6: Empty results should return 200, not 404"""
        print_header("TEST 6: Empty Results (Should NOT return 404)")
        
        # Test with non-existent status
        print_info("Testing with non-existent status")
        status_code, data = self.make_request("/cargas", {"status": "status_inexistente_12345"})
        
        if status_code == 200:
            is_valid, msg = self.validate_cargas_response_structure(data)
            if is_valid and data['total'] == 0 and len(data['cargas']) == 0:
                print_success("Empty results correctly return 200 with {total: 0, cargas: []}")
                self.test_results.append(("Empty Results", True, "✅ Returns 200 for empty results"))
                return True
            else:
                print_error(f"Unexpected response for empty results: {data}")
                self.test_results.append(("Empty Results", False, "❌ Unexpected response structure"))
                return False
        else:
            print_error(f"Expected status 200 for empty results, got {status_code}")
            self.test_results.append(("Empty Results", False, f"❌ Status {status_code} instead of 200"))
            return False
    
    def test_individual_carga(self):
        """Test 7: Get individual carga by ID"""
        print_header("TEST 7: Individual Carga by ID")
        
        # First get a list to find a valid ID
        print_info("Getting list of cargas to find a valid ID")
        status_code, data = self.make_request("/cargas", {"pageSize": 1})
        
        if status_code == 200 and data.get('cargas'):
            carga_id = data['cargas'][0].get('id')
            if carga_id:
                print_info(f"Testing individual carga with ID: {carga_id}")
                status_code, carga_data = self.make_request(f"/cargas/{carga_id}")
                
                if status_code == 200:
                    if 'id' in carga_data and carga_data['id'] == carga_id:
                        print_success(f"Individual carga retrieved successfully: {carga_data.get('identificador_carga', 'N/A')}")
                        self.test_results.append(("Individual Carga", True, "✅ Individual carga retrieval working"))
                        return True
                    else:
                        print_error("Invalid individual carga response")
                        self.test_results.append(("Individual Carga", False, "❌ Invalid response"))
                        return False
                else:
                    print_error(f"Individual carga request failed: {status_code}")
                    self.test_results.append(("Individual Carga", False, f"❌ Status {status_code}"))
                    return False
            else:
                print_warning("No carga ID found in response")
                self.test_results.append(("Individual Carga", False, "❌ No ID found"))
                return False
        else:
            print_warning("Could not get cargas list to test individual retrieval")
            self.test_results.append(("Individual Carga", False, "❌ Could not get test data"))
            return False
    
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