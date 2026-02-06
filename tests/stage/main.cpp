#include <cstdio>
#include <emscripten.h>
#include <cstdlib>
#include <string>
#include <algorithm>
#include <emscripten/bind.h>
#include <cstdint>
#include <optional>
#include <iostream>
#include <errno.h>
#include <cstdlib>
#include <chrono>
#include <stdexcept>

#ifdef __INTELLISENSE__
#define EMSCRIPTEN_KEEPALIVE
#endif

using namespace emscripten;

#define PI 3.1416
#define EULER 2.7182818
const float pi = 3.1416;
const double euler = 2.7182818;

struct StructTest
{
    std::string string;
    float number;
    int triple[3];
};

struct Point2f
{
    float x;
    int y;
};

struct ArrayInStruct
{
    int field[2];
};

Point2f TestPoint = {10.5, 11};
std::string TestString = std::string{"Test string content"};
std::wstring TestWString = L"wstring test";

float lerp(float a, float b, float t)
{
    return (1 - t) * a + t * b;
}

Point2f getPoint()
{
    return {10.5, 12};
}

char charAt(const std::string &str, std::size_t i)
{
    return str[i];
}

class TestClassBase
{

public:
    TestClassBase(int _a) : a(_a) {}

    int a;
};

class TestClass : public TestClassBase
{
public:
    TestClass(int x, std::string y) : TestClassBase(0), x(x), y(y)
    {
    }

    TestClass &incrementX()
    {
        ++x;
        return *this;
    }

    int getX() const { return x; }
    void setX(int x_) { x = x_; }

    static std::string getStringFromInstance(const TestClass &instance)
    {
        return instance.y;
    }

    static TestClass *create()
    {
        return new TestClass{0, ""};
    }

    static const TestClass *identityConstPointer(const TestClass *input) { return input; }
    static TestClass *identityPointer(TestClass *input) { return input; }
    static TestClass &identityReference(TestClass &input) { return input; }
    static const TestClass &identityConstReference(const TestClass &input) { return input; }
    static TestClass identityCopy(TestClass input) { return input; }

private:
    int x;
    std::string y;
};

// template<typename T> T identityT(T value) { return value; }
std::uint8_t identity_u8(std::uint8_t value) { return value; }
std::int8_t identity_i8(std::int8_t value) { return value; }
std::uint16_t identity_u16(std::uint16_t value) { return value; }
std::int16_t identity_i16(std::int16_t value) { return value; }
std::uint32_t identity_u32(std::uint32_t value) { return value; }
std::int32_t identity_i32(std::int32_t value) { return value; }
std::uint64_t identity_u64(std::uint64_t value) { return value; }
std::int64_t identity_i64(std::int64_t value) { return value; }
std::string identity_string(std::string value) { return value; }
//std::u8string identity_u8string(std::u8string value) { return value; }
std::u16string identity_u16string(std::u16string value) { return value; }
std::u32string identity_u32string(std::u32string value) { return value; }
std::wstring identity_wstring(std::wstring value) { return value; }
int *identity_intptr(int *value) { return value; }

const TestClass *testClassArray()
{
    thread_local std::vector<TestClass> ret{};
    ret.push_back(TestClass{static_cast<int>(ret.size()), "Test string"});
    return ret.data();
}

TestClass *testClassPointerMutable()
{
    thread_local TestClass ret{1, "Pointer"};
    return &ret;
}

const TestClass *testClassPointerConst()
{
    return testClassPointerMutable();
}

TestClass &testClassReferenceMutable()
{
    thread_local TestClass ret{2, "Reference"};
    return ret;
}

const TestClass &testClassReferenceConst()
{
    return testClassReferenceMutable();
}

enum OldStyle
{
    OLD_STYLE_ZERO,
    OLD_STYLE_ONE,
    OLD_STYLE_TEN = 10
};

enum struct NewStyle
{
    ZERO,
    ONE,
    TEN = 10
};

OldStyle identity_old_enum(OldStyle value) { return value; }
NewStyle identity_new_enum(NewStyle value) { return value; }
// const StructTest* identity_struct_pointer(const StructTest* value) { return value; }
StructTest identity_struct_copy(StructTest value) { return value; }
void struct_consume(StructTest value) { return; }
StructTest struct_create()
{
    StructTest ret;
    ret.string = "This is a test string that is intended to be somewhat long to possibly expose issues more easily";
    ret.number = 5.0f;
    ret.triple[0] = 10;
    ret.triple[1] = 100;
    ret.triple[2] = 1000;
    return ret;
}

void throwsException()
{
    throw std::runtime_error("throwsException was called");
}

void catchesException()
{
    try
    {
        puts("throw...");
        throw std::runtime_error("catchesException was called");
        puts("(never reached)");
    }
    catch (...)
    {
        puts("catch!");
    }
}

std::int64_t nowSteady() { return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count(); }
std::int64_t nowSystem() { return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count(); }
void identityStdout()
{
    std::string input = "";
    std::cin >> input;
    std::cout << input << std::endl;
}

std::string returnStdin()
{
    std::string input = "";
    std::cin >> input;
    return input;
}

std::string getenv2(std::string key)
{
    return std::string{std::getenv(key.c_str())};
}

EMSCRIPTEN_BINDINGS(constants)
{
    emscripten::constant("PI", PI);
    emscripten::constant("EULER", EULER);
    emscripten::constant("pi", pi);
    emscripten::constant("euler", euler);
    emscripten::constant("max_uint8", std::numeric_limits<std::uint8_t>::max());
    emscripten::constant("min_uint8", std::numeric_limits<std::uint8_t>::min());
    emscripten::constant("max_int8", std::numeric_limits<std::int8_t>::max());
    emscripten::constant("min_int8", std::numeric_limits<std::int8_t>::min());
    emscripten::constant("max_uint16", std::numeric_limits<std::uint16_t>::max());
    emscripten::constant("min_uint16", std::numeric_limits<std::uint16_t>::min());
    emscripten::constant("max_int16", std::numeric_limits<std::int16_t>::max());
    emscripten::constant("min_int16", std::numeric_limits<std::int16_t>::min());
    emscripten::constant("max_uint32", std::numeric_limits<std::uint32_t>::max());
    emscripten::constant("min_uint32", std::numeric_limits<std::uint32_t>::min());
    emscripten::constant("max_int32", std::numeric_limits<std::int32_t>::max());
    emscripten::constant("min_int32", std::numeric_limits<std::int32_t>::min());
    emscripten::constant("max_uint64", std::numeric_limits<std::uint64_t>::max());
    emscripten::constant("min_uint64", std::numeric_limits<std::uint64_t>::min());
    emscripten::constant("max_int64", std::numeric_limits<std::int64_t>::max());
    emscripten::constant("min_int64", std::numeric_limits<std::int64_t>::min());

    emscripten::enum_<OldStyle>("OldStyle")
        .value("ZERO", OLD_STYLE_ZERO)
        .value("ONE", OLD_STYLE_ONE)
        .value("TEN", OLD_STYLE_TEN);
    emscripten::enum_<NewStyle>("NewStyle")
        .value("ZERO", NewStyle::ZERO)
        .value("ONE", NewStyle::ONE)
        .value("TEN", NewStyle::TEN);

    emscripten::value_array<std::array<int, 3>>("array_int_3")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>());

    value_object<StructTest>("StructTest")
        .field("string", &StructTest::string)
        .field("number", &StructTest::number)
        .field("triple", &StructTest::triple);
    value_array<Point2f>("Point2fTuple").element(&Point2f::x).element(&Point2f::y);
    // value_object<Point2f>("Point2f").field("x", &Point2f::x).field("y", &Point2f::y);
    emscripten::constant("TestPoint", TestPoint);
    emscripten::function("getPoint", &getPoint);
    emscripten::constant("TestString", TestString);
    emscripten::constant("TestWString", TestWString);
    emscripten::function("identity_u8", &identity_u8);
    emscripten::function("identity_i8", &identity_i8);
    emscripten::function("identity_u16", &identity_u16);
    emscripten::function("identity_i16", &identity_i16);
    emscripten::function("identity_u32", &identity_u32);
    emscripten::function("identity_i32", &identity_i32);
    emscripten::function("identity_u64", &identity_u64);
    emscripten::function("identity_i64", &identity_i64);
    emscripten::function("identity_string", &identity_string);
    //emscripten::function("identity_u8string", &identity_u8string);
    emscripten::function("identity_u16string", &identity_u16string);
    emscripten::function("identity_u32string", &identity_u32string);
    emscripten::function("identity_wstring", &identity_wstring);
    emscripten::function("identity_old_enum", &identity_old_enum);
    emscripten::function("identity_new_enum", &identity_new_enum);
    emscripten::function("identity_stdout", &identityStdout);
    emscripten::function("return_stdin", &returnStdin);
    // emscripten::function("identity_struct_pointer", &identity_struct_pointer, emscripten::allow_raw_pointers());
    emscripten::function("struct_create", &struct_create);
    emscripten::function("struct_consume", &struct_consume);
    emscripten::function("identity_struct_copy", &identity_struct_copy);
    emscripten::function("identity_intptr", reinterpret_cast<std::uintptr_t (*)(std::uintptr_t value)>(&identity_intptr), emscripten::allow_raw_pointers());
    emscripten::function("lerp", &lerp);
    emscripten::function("charAt", &charAt);
    emscripten::function("nowSteady", &nowSteady);
    emscripten::function("nowSystem", &nowSystem);
    emscripten::function("throwsException", &throwsException);
    emscripten::function("catchesException", &catchesException);
    emscripten::function("getenv", &getenv2);
    emscripten::function("testClassArray", reinterpret_cast<std::uintptr_t (*)()>(&testClassArray));
    emscripten::function("testClassPointerMutable", &testClassPointerMutable, return_value_policy::reference());
    emscripten::function("testClassPointerConst", &testClassPointerConst, return_value_policy::reference());
    emscripten::function("testClassReferenceMutable", &testClassReferenceMutable, return_value_policy::reference());
    emscripten::class_<TestClassBase>("TestClassBase")
        .constructor<int>();
    emscripten::class_<TestClass>("TestClass")
        .constructor<int, std::string>()
        .function("incrementX", &TestClass::incrementX, return_value_policy::reference())
        .function("setX", &TestClass::setX)
        .function("getX", &TestClass::getX)
        .class_function("identityConstPointer", &TestClass::identityConstPointer, emscripten::allow_raw_pointers())
        .class_function("identityPointer", &TestClass::identityPointer, emscripten::allow_raw_pointers())
        .class_function("identityReference", &TestClass::identityReference, return_value_policy::reference())
        .class_function("identityConstReference", &TestClass::identityConstReference)
        .class_function("identityCopy", &TestClass::identityCopy)
        .property("x", &TestClass::getX, &TestClass::setX)
        .property("x_readonly", &TestClass::getX)
        .class_function("create", &TestClass::create, emscripten::allow_raw_pointers());
    // value_array<Point2f>("Point2fTuple").element(&Point2f::x).element(&Point2f::y);
    value_object<Point2f>("Point2f").field("x", &Point2f::x).field("y", &Point2f::y);
    value_object<ArrayInStruct>("ArrayInStruct").field("field", &ArrayInStruct::field);
    value_array<std::array<int, 2>>("array_int_2").element(emscripten::index<0>()).element(emscripten::index<1>());
}

extern "C"
{
    static EMSCRIPTEN_KEEPALIVE unsigned long long KEY = 0xDEADBEEF;

    EMSCRIPTEN_KEEPALIVE int printTest()
    {
        // Note: Don't use puts, because that appends a newline (fputs doesn't).
        int ret = std::fputs("Hello, world!", stdout);
        std::fflush(stdout);
        return ret;
    }

    EMSCRIPTEN_KEEPALIVE double getRandomNumber()
    {
        return std::rand() / static_cast<double>(RAND_MAX);
    }

    EMSCRIPTEN_KEEPALIVE unsigned long long getKey()
    {
        return KEY;
    }

    EMSCRIPTEN_KEEPALIVE const char *reverseInput()
    {
        char input[0x100] = {};
        std::fgets(input, sizeof(input), stdin);
        thread_local std::string ret{input};
        std::reverse(ret.begin(), ret.end());
        return ret.c_str();
    }
}
